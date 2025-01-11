// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import { extractProperties } from '../helpers';
import {
  OneTrustAssessmentCodec,
  OneTrustAssessmentNestedQuestionCodec,
  // OneTrustAssessmentNestedQuestionCodec,
  OneTrustAssessmentQuestionCodec,
  OneTrustAssessmentQuestionOptionCodec,
  // OneTrustAssessmentQuestionFlatCodec,
  // OneTrustAssessmentQuestionResponseCodec,
  // OneTrustAssessmentQuestionRiskCodec,
  OneTrustAssessmentSectionCodec,
  OneTrustAssessmentSectionFlatHeaderCodec,
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

const flattenList = (list: any[], prefix: string): any => {
  if (list.length === 0) {
    return {};
  }
  const listFlat = list.map((obj) => flattenObject(obj, prefix));

  // get all possible keys from the listFlat
  // TODO: make helper
  const allKeys = Array.from(new Set(listFlat.flatMap((a) => Object.keys(a))));

  // build a single object where all the keys contain the respective values of listFlat
  return allKeys.reduce((acc, key) => {
    const values = listFlat.map((a) => a[key] ?? '').join(',');
    acc[key] = values;
    return acc;
  }, {} as Record<string, any>);
};

// const flattenOneTrustQuestionResponses = (
//   questionResponses: OneTrustAssessmentQuestionResponseCodec[],
//   prefix: string,
// ): any => {
//   if (questionResponses.length === 0) {
//     return {};
//   }

//   // despite being an array, questionResponses only returns one element
//   const { responses, ...rest } = questionResponses[0];
//   return {
//     ...flattenList(responses, prefix),
//     ...flattenObject(rest, prefix),
//   };
// };

const flattenOneTrustNestedQuestionsOptions = (
  allOptions: (OneTrustAssessmentQuestionOptionCodec[] | null)[],
  prefix: string,
): any => {
  const allOptionsFlat = allOptions.map((options) =>
    flattenList(options ?? [], prefix),
  );

  // extract all keys across allSectionQuestionsFlat
  const allKeys = Array.from(
    new Set(allOptionsFlat.flatMap((a) => Object.keys(a))),
  );

  // TODO: comment
  return allOptionsFlat.reduce(
    (acc, optionsFlat) =>
      Object.fromEntries(
        allKeys.map((key) => [
          key,
          `${acc[key] === undefined ? '' : `${acc[key]},`}[${
            optionsFlat[key] ?? ''
          }]`,
        ]),
      ),
    {},
  );
};

const flattenOneTrustNestedQuestions = (
  questions: OneTrustAssessmentNestedQuestionCodec[],
  prefix: string,
): any => {
  // TODO: how do extract properties handle null
  const { options: allOptions, rest } = extractProperties(questions, [
    'options',
  ]);

  return {
    ...flattenList(rest, prefix),
    ...flattenOneTrustNestedQuestionsOptions(allOptions, `${prefix}_options`),
  };
};

const flattenOneTrustQuestions = (
  allSectionQuestions: OneTrustAssessmentQuestionCodec[][],
  prefix: string,
): any => {
  const allSectionQuestionsFlat = allSectionQuestions.map(
    (sectionQuestions) => {
      // extract nested properties (TODO: try to make a helper for this!!!)
      const {
        question: questions,
        // questionResponses: allQuestionResponses,
        // risks: allRisks,
        rest: unnestedSectionQuestions,
      } = extractProperties(sectionQuestions, [
        'question',
        'questionResponses',
        'risks',
      ]);

      return {
        ...flattenList(unnestedSectionQuestions, prefix),
        ...flattenOneTrustNestedQuestions(questions, prefix),
      };
    },
  );

  // extract all keys across allSectionQuestionsFlat
  const allKeys = Array.from(
    new Set(allSectionQuestionsFlat.flatMap((a) => Object.keys(a))),
  );

  // TODO: comment
  return allSectionQuestionsFlat.reduce(
    (acc, flatSectionQuestions) =>
      Object.fromEntries(
        allKeys.map((key) => [
          key,
          `${acc[key] === undefined ? '' : `${acc[key]},`}[${
            flatSectionQuestions[key] ?? ''
          }]`,
        ]),
      ),
    {},
  );
};

const flattenOneTrustSectionHeaders = (
  headers: OneTrustAssessmentSectionHeaderCodec[],
  prefix: string,
): any => {
  // TODO: do this for EVERY nested object that may be null
  const defaultRiskStatistics: OneTrustAssessmentSectionHeaderRiskStatisticsCodec =
    {
      maxRiskLevel: null,
      riskCount: null,
      sectionId: null,
    };

  const { riskStatistics, flatHeaders } = headers.reduce<{
    /** The risk statistics of all headers */
    riskStatistics: OneTrustAssessmentSectionHeaderRiskStatisticsCodec[];
    /** The headers without risk statistics */
    flatHeaders: OneTrustAssessmentSectionFlatHeaderCodec[];
  }>(
    (acc, header) => {
      const { riskStatistics, ...rest } = header;
      return {
        riskStatistics: [
          ...acc.riskStatistics,
          riskStatistics ?? defaultRiskStatistics,
        ],
        flatHeaders: [...acc.flatHeaders, rest],
      };
    },
    {
      riskStatistics: [],
      flatHeaders: [],
    },
  );

  return {
    ...flattenList(flatHeaders, prefix),
    ...flattenList(riskStatistics, `${prefix}_riskStatistics`),
  };
};

const flattenOneTrustSections = (
  sections: OneTrustAssessmentSectionCodec[],
  prefix: string,
): any => {
  const {
    questions: allQuestions,
    header: headers,
    rest: unnestedSections,
  } = extractProperties(sections, ['questions', 'header']);

  const sectionsFlat = flattenList(unnestedSections, prefix);
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
  const {
    // TODO: handle these
    // approvers,
    // primaryEntityDetails,
    // respondents,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    respondent,
    sections,
    ...rest
  } = assessmentDetails;

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
