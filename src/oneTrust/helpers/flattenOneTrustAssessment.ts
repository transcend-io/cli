// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  OneTrustAssessmentNestedQuestion,
  OneTrustAssessmentQuestionOption,
  OneTrustAssessmentQuestionResponses,
  OneTrustAssessmentSectionHeader,
  OneTrustRiskCategories,
} from '@transcend-io/privacy-types';
import { extractProperties } from '../../helpers';
import {
  OneTrustEnrichedAssessment,
  OneTrustEnrichedAssessmentQuestion,
  OneTrustEnrichedAssessmentSection,
  OneTrustEnrichedRisk,
} from '../codecs';

// FIXME: move to @transcend/type-utils, document and write tests
const flattenObject = (obj: any, prefix = ''): any =>
  Object.keys(obj ?? []).reduce((acc, key) => {
    const newKey = prefix ? `${prefix}_${key}` : key;

    const entry = obj[key];
    if (typeof entry === 'object' && entry !== null && !Array.isArray(entry)) {
      Object.assign(acc, flattenObject(entry, newKey));
    } else {
      acc[newKey] = Array.isArray(entry)
        ? entry
            .map((e) => {
              if (typeof e === 'string') {
                return e.replaceAll(',', '');
              }
              return e ?? '';
            })
            .join(',')
        : typeof entry === 'string'
        ? entry.replaceAll(',', '')
        : entry ?? '';
    }
    return acc;
  }, {} as Record<string, any>);

// FIXME: move to @transcend/type-utils
/**
 * Aggregates multiple objects into a single object by combining values of matching keys.
 * For each key present in any of the input objects, creates a comma-separated string
 * of values from all objects.
 *
 * @param param - the objects to aggregate and the aggregation method
 * @returns a single object containing all unique keys with aggregated values
 * @example
 * const obj1 = { name: 'John', age: 30 };
 * const obj2 = { name: 'Jane', city: 'NY' };
 * const obj3 = { name: 'Bob', age: 25 };
 *
 * // Without wrap
 * aggregateObjects({ objs: [obj1, obj2, obj3] })
 * // Returns: { name: 'John,Jane,Bob', age: '30,,25', city: ',NY,' }
 *
 * // With wrap
 * aggregateObjects({ objs: [obj1, obj2, obj3], wrap: true })
 * // Returns: { name: '[John],[Jane],[Bob]', age: '[30],[],[25]', city: '[],[NY],[]' }
 */
const aggregateObjects = ({
  objs,
  wrap = false,
}: {
  /** the objects to aggregate in a single one */
  objs: any[];
  /** whether to wrap the concatenated values in a [] */
  wrap?: boolean;
}): any => {
  const allKeys = Array.from(new Set(objs.flatMap((a) => Object.keys(a))));

  // Reduce into a single object, where each key contains concatenated values from all input objects
  return allKeys.reduce((acc, key) => {
    const values = objs
      .map((o) => (wrap ? `[${o[key] ?? ''}]` : o[key] ?? ''))
      .join(',');
    acc[key] = values;
    return acc;
  }, {} as Record<string, any>);
};

const flattenOneTrustNestedQuestionsOptions = (
  allOptions: (OneTrustAssessmentQuestionOption[] | null)[],
  prefix: string,
): any => {
  const allOptionsFlat = allOptions.map((options) => {
    const flatOptions = (options ?? []).map((o) => flattenObject(o, prefix));
    return aggregateObjects({ objs: flatOptions });
  });

  return aggregateObjects({ objs: allOptionsFlat, wrap: true });
};

const flattenOneTrustNestedQuestions = (
  questions: OneTrustAssessmentNestedQuestion[],
  prefix: string,
): any => {
  const { options: allOptions, rest: restQuestions } = extractProperties(
    questions,
    ['options'],
  );

  const restQuestionsFlat = restQuestions.map((r) => flattenObject(r, prefix));
  return {
    ...aggregateObjects({ objs: restQuestionsFlat }),
    ...flattenOneTrustNestedQuestionsOptions(allOptions, `${prefix}_options`),
  };
};

// flatten questionResponses of every question within a section
const flattenOneTrustQuestionResponses = (
  allQuestionResponses: OneTrustAssessmentQuestionResponses[],
  prefix: string,
): any => {
  const allQuestionResponsesFlat = allQuestionResponses.map(
    (questionResponses) => {
      const { responses, rest: restQuestionResponses } = extractProperties(
        questionResponses.map((q) => ({
          ...q,
          // there is always just one response within responses
          responses: q.responses[0],
        })),
        ['responses'],
      );

      const responsesFlat = (responses ?? []).map((r) =>
        flattenObject(r, prefix),
      );
      const restQuestionResponsesFlat = (restQuestionResponses ?? []).map((q) =>
        flattenObject(q, prefix),
      );
      return {
        ...aggregateObjects({ objs: responsesFlat }),
        ...aggregateObjects({ objs: restQuestionResponsesFlat }),
      };
    },
  );
  return aggregateObjects({ objs: allQuestionResponsesFlat, wrap: true });
};

const flattenOneTrustRiskCategories = (
  allCategories: OneTrustRiskCategories[],
  prefix: string,
): any => {
  const allCategoriesFlat = (allCategories ?? []).map((categories) => {
    const flatCategories = categories.map((c) => flattenObject(c, prefix));
    return aggregateObjects({ objs: flatCategories });
  });
  return aggregateObjects({ objs: allCategoriesFlat, wrap: true });
};

const flattenOneTrustRisks = (
  allRisks: (OneTrustEnrichedRisk[] | null)[],
  prefix: string,
): any => {
  // TODO: extract categories and other nested properties
  const allRisksFlat = (allRisks ?? []).map((risks) => {
    const { categories, rest: restRisks } = extractProperties(risks ?? [], [
      'categories',
    ]);

    const flatRisks = (restRisks ?? []).map((r) => flattenObject(r, prefix));
    return {
      ...aggregateObjects({ objs: flatRisks }),
      ...flattenOneTrustRiskCategories(categories, `${prefix}_categories`),
    };
  });

  return aggregateObjects({ objs: allRisksFlat, wrap: true });
};

const flattenOneTrustQuestions = (
  allSectionQuestions: OneTrustEnrichedAssessmentQuestion[][],
  prefix: string,
): any => {
  const allSectionQuestionsFlat = allSectionQuestions.map(
    (sectionQuestions) => {
      // extract nested properties (TODO: try to make a helper for this!!!)
      const {
        rest: restSectionQuestions,
        question: questions,
        questionResponses: allQuestionResponses,
        risks: allRisks,
      } = extractProperties(sectionQuestions, [
        'question',
        'questionResponses',
        'risks',
      ]);

      const restSectionQuestionsFlat = restSectionQuestions.map((q) =>
        flattenObject(q, prefix),
      );

      return {
        ...aggregateObjects({ objs: restSectionQuestionsFlat }),
        ...flattenOneTrustNestedQuestions(questions, prefix),
        ...flattenOneTrustRisks(allRisks, `${prefix}_risks`),
        ...flattenOneTrustQuestionResponses(
          allQuestionResponses,
          `${prefix}_questionResponses`,
        ),
      };
    },
  );

  return aggregateObjects({
    objs: allSectionQuestionsFlat,
    wrap: true,
  });
};

const flattenOneTrustSectionHeaders = (
  headers: OneTrustAssessmentSectionHeader[],
  prefix: string,
): any => {
  const { riskStatistics, rest: restHeaders } = extractProperties(headers, [
    'riskStatistics',
  ]);

  const flatFlatHeaders = restHeaders.map((h) => flattenObject(h, prefix));
  const flatRiskStatistics = riskStatistics.map((r) =>
    flattenObject(r, `${prefix}_riskStatistics`),
  );
  return {
    ...aggregateObjects({ objs: flatFlatHeaders }),
    ...aggregateObjects({ objs: flatRiskStatistics }),
  };
};

// TODO: update type to be
const flattenOneTrustSections = (
  sections: OneTrustEnrichedAssessmentSection[],
  prefix: string,
): any => {
  const {
    questions: allQuestions,
    header: headers,
    rest: restSections,
  } = extractProperties(sections, ['questions', 'header']);

  const restSectionsFlat = restSections.map((s) => flattenObject(s, prefix));
  const sectionsFlat = aggregateObjects({ objs: restSectionsFlat });
  const headersFlat = flattenOneTrustSectionHeaders(headers, prefix);
  const questionsFlat = flattenOneTrustQuestions(
    allQuestions,
    `${prefix}_questions`,
  );

  return { ...sectionsFlat, ...headersFlat, ...questionsFlat };
};

// TODO: update type to be a Record<OneTrustAssessmentCsvHeader, string>
export const flattenOneTrustAssessment = (
  combinedAssessment: OneTrustEnrichedAssessment,
): Record<string, string> => {
  const {
    approvers,
    primaryEntityDetails,
    respondents,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    respondent,
    sections,
    ...rest
  } = combinedAssessment;

  // TODO: extract approver from approvers, otherwise it won't agree with the codec
  const flatApprovers = approvers.map((approver) =>
    flattenObject(approver, 'approvers'),
  );
  const flatRespondents = respondents.map((respondent) =>
    flattenObject(respondent, 'respondents'),
  );
  const flatPrimaryEntityDetails = primaryEntityDetails.map(
    (primaryEntityDetail) =>
      flattenObject(primaryEntityDetail, 'primaryEntityDetails'),
  );

  return {
    ...flattenObject(rest),
    ...aggregateObjects({ objs: flatApprovers }),
    ...aggregateObjects({ objs: flatRespondents }),
    ...aggregateObjects({ objs: flatPrimaryEntityDetails }),
    ...flattenOneTrustSections(sections, 'sections'),
  };
};
