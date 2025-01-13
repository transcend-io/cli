// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  enrichCombinedAssessmentWithDefaults,
  extractProperties,
} from '../helpers';
import {
  OneTrustCombinedAssessmentCodec,
  OneTrustAssessmentNestedQuestionCodec,
  OneTrustAssessmentQuestionOptionCodec,
  OneTrustAssessmentQuestionResponseCodec,
  OneTrustAssessmentSectionHeaderCodec,
  OneTrustEnrichedAssessmentQuestionCodec,
  OneTrustEnrichedAssessmentSectionCodec,
  OneTrustEnrichedRiskCodec,
  OneTrustRiskCategories,
} from './codecs';
// import { DEFAULT_ONE_TRUST_COMBINED_ASSESSMENT } from './constants';

// TODO: will have to use something like csv-stringify

// TODO: test what happens when a value is null -> it should convert to ''
const flattenObject = (obj: any, prefix = ''): any =>
  Object.keys(obj).reduce((acc, key) => {
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

// TODO: move to helpers
const aggregateObjects = ({
  objs,
  wrap = false,
}: {
  /** the objects to aggregate in a single one */
  objs: any[];
  /** whether to wrap the values in a [] */
  wrap?: boolean;
}): any => {
  const allKeys = Array.from(new Set(objs.flatMap((a) => Object.keys(a))));

  // build a single object where all the keys contain the respective values of objs
  return allKeys.reduce((acc, key) => {
    const values = objs
      .map((a) => (wrap ? `[${a[key] ?? ''}]` : a[key] ?? ''))
      .join(',');
    acc[key] = values;
    return acc;
  }, {} as Record<string, any>);
};

const flattenOneTrustNestedQuestionsOptions = (
  allOptions: (OneTrustAssessmentQuestionOptionCodec[] | null)[],
  prefix: string,
): any => {
  const allOptionsFlat = allOptions.map((options) => {
    const flatOptions = (options ?? []).map((o) => flattenObject(o, prefix));
    return aggregateObjects({ objs: flatOptions });
  });

  return aggregateObjects({ objs: allOptionsFlat, wrap: true });
};

const flattenOneTrustNestedQuestions = (
  questions: OneTrustAssessmentNestedQuestionCodec[],
  prefix: string,
): any => {
  // TODO: how do extract properties handle null
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
  allQuestionResponses: OneTrustAssessmentQuestionResponseCodec[][],
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
  const allCategoriesFlat = allCategories.map((categories) => {
    const flatCategories = categories.map((c) => flattenObject(c, prefix));
    return aggregateObjects({ objs: flatCategories });
  });
  return aggregateObjects({ objs: allCategoriesFlat, wrap: true });
};

const flattenOneTrustRisks = (
  allRisks: (OneTrustEnrichedRiskCodec[] | null)[],
  prefix: string,
): any => {
  // TODO: extract categories and other nested properties
  const allRisksFlat = allRisks.map((risks) => {
    const { categories, rest: restRisks } = extractProperties(risks ?? [], [
      'categories',
    ]);

    const flatRisks = restRisks.map((r) => flattenObject(r, prefix));
    return {
      ...aggregateObjects({ objs: flatRisks }),
      ...flattenOneTrustRiskCategories(categories, `${prefix}_categories`),
    };
  });

  return aggregateObjects({ objs: allRisksFlat, wrap: true });
};

const flattenOneTrustQuestions = (
  allSectionQuestions: OneTrustEnrichedAssessmentQuestionCodec[][],
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
  headers: OneTrustAssessmentSectionHeaderCodec[],
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

const flattenOneTrustSections = (
  sections: OneTrustEnrichedAssessmentSectionCodec[],
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

export const flattenOneTrustAssessment = (
  combinedAssessment: OneTrustCombinedAssessmentCodec,
): any => {
  /**
   * TODO: experiment creating a default assessment with
   *     const result = createDefaultCodec(OneTrustGetAssessmentResponseCodec);
   * Then, flatten it and aggregate it with the actual assessment. This way, every
   * assessment will always have the same fields!
   */

  const flatten = (assessment: OneTrustCombinedAssessmentCodec): any => {
    const {
      approvers,
      primaryEntityDetails,
      respondents,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      respondent,
      sections,
      ...rest
    } = assessment;

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

  // add default values to assessments
  const combinedAssessmentWithDefaults =
    enrichCombinedAssessmentWithDefaults(combinedAssessment);

  const combinedAssessmentFlat = flatten(combinedAssessmentWithDefaults);
  // const defaultAssessmentFlat = flatten(DEFAULT_ONE_TRUST_COMBINED_ASSESSMENT);

  return combinedAssessmentFlat;
};
/**
 *
 *
 * TODO: convert to camelCase -> Title Case
 * TODO: section -> header is spread
 * TODO: section -> questions -> question is spread
 * TODO: section -> questions -> question -> questionOptions are aggregated
 * TODO: section -> questions -> question -> questionResponses -> responses are spread
 */
