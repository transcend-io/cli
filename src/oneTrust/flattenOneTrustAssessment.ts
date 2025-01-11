// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  enrichPrimaryEntityDetailsWithDefault,
  enrichSectionsWithDefault,
  extractProperties,
} from '../helpers';
import {
  OneTrustAssessmentCodec,
  OneTrustAssessmentNestedQuestionCodec,
  OneTrustAssessmentQuestionCodec,
  OneTrustAssessmentQuestionOptionCodec,
  OneTrustAssessmentQuestionResponseCodec,
  OneTrustAssessmentSectionCodec,
  OneTrustAssessmentSectionHeaderCodec,
  OneTrustAssessmentSectionHeaderRiskStatisticsCodec,
  OneTrustEnrichedRiskCodec,
  OneTrustGetAssessmentResponseCodec,
} from './codecs';

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

// TODO: comment
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
        questionResponses,
        ['responses'],
      );

      // TODO: replace possible null values within responses
      // const defaultObject = {
      //   id: null,
      //   name: null,
      //   nameKey: null,
      // };

      // TODO: do we handle it right when empty?
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

const flattenOneTrustQuestions = (
  allSectionQuestions: OneTrustAssessmentQuestionCodec[][],
  prefix: string,
): any => {
  const allSectionQuestionsFlat = allSectionQuestions.map(
    (sectionQuestions) => {
      // extract nested properties (TODO: try to make a helper for this!!!)
      const {
        rest: restSectionQuestions,
        question: questions,
        questionResponses: allQuestionResponses,
        // risks: allRisks,
      } = extractProperties(sectionQuestions, [
        'question',
        'questionResponses',
        'risks',
      ]);

      const restSectionQuestionsFlat = restSectionQuestions.map((q) =>
        flattenObject(q, prefix),
      );

      const result = flattenOneTrustQuestionResponses(
        allQuestionResponses,
        `${prefix}_questionResponses`,
      );

      return {
        ...aggregateObjects({ objs: restSectionQuestionsFlat }),
        ...flattenOneTrustNestedQuestions(questions, prefix),
        ...result,
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
  // TODO: set a default  for EVERY nested object that may be null
  const defaultRiskStatistics: OneTrustAssessmentSectionHeaderRiskStatisticsCodec =
    {
      maxRiskLevel: null,
      riskCount: null,
      sectionId: null,
    };

  const { riskStatistics, rest: restHeaders } = extractProperties(headers, [
    'riskStatistics',
  ]);

  const flatFlatHeaders = restHeaders.map((h) => flattenObject(h, prefix));
  const flatRiskStatistics = riskStatistics.map((r) =>
    flattenObject(r ?? defaultRiskStatistics, `${prefix}_riskStatistics`),
  );
  return {
    ...aggregateObjects({ objs: flatFlatHeaders }),
    ...aggregateObjects({ objs: flatRiskStatistics }),
  };
};

const flattenOneTrustSections = (
  sections: OneTrustAssessmentSectionCodec[],
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

export const flattenOneTrustAssessment = ({
  assessment,
  assessmentDetails,
}: {
  /** the assessment */
  assessment: OneTrustAssessmentCodec;
  /** the assessment with details */
  assessmentDetails: OneTrustGetAssessmentResponseCodec & {
    /** the sections enriched with risk details */
    sections: (OneTrustAssessmentSectionCodec & {
      /** the questions enriched with risk details */
      questions: (OneTrustAssessmentQuestionCodec & {
        /** the enriched risk details */
        risks: OneTrustEnrichedRiskCodec[] | null;
      })[];
    })[];
  };
}): any => {
  // add default values to assessments
  const transformedAssessmentDetails = {
    ...assessmentDetails,
    primaryEntityDetails: enrichPrimaryEntityDetailsWithDefault(
      assessmentDetails.primaryEntityDetails,
    ),
    sections: enrichSectionsWithDefault(assessmentDetails.sections),
  };

  const {
    // TODO: handle these
    // approvers,
    // primaryEntityDetails,
    // respondents,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    respondent,
    sections,
    ...rest
  } = transformedAssessmentDetails;

  // console.log({ approvers: flattenApprovers(approvers) });
  return {
    ...flattenObject(assessment),
    ...flattenObject(rest),
    // ...flattenList(approvers, 'approvers'),
    // ...flattenList(primaryEntityDetails, 'primaryEntityDetails'),
    // ...flattenList(respondents, 'respondents'),
    ...flattenOneTrustSections(sections, 'sections'),
  };
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
