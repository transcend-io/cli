// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  OneTrustAssessmentCodec,
  OneTrustAssessmentQuestionCodec,
  // OneTrustAssessmentQuestionResponsesCodec,
  OneTrustAssessmentSectionCodec,
  OneTrustAssessmentSectionFlatHeaderCodec,
  OneTrustAssessmentSectionHeaderCodec,
  OneTrustAssessmentSectionHeaderRiskStatisticsCodec,
  OneTrustEnrichedRiskCodec,
  OneTrustFlatAssessmentSectionCodec,
  OneTrustGetAssessmentResponseCodec,
} from './codecs';

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
  const flattenedList = list.map((obj) => flattenObject(obj, prefix));

  // get all possible keys from the flattenedList
  const allKeys = Array.from(
    new Set(flattenedList.flatMap((a) => Object.keys(a))),
  );

  // build a single object where all the keys contain the respective values of flattenedList
  return allKeys.reduce((acc, key) => {
    const values = flattenedList.map((a) => a[key] ?? '').join(',');
    acc[key] = values;
    return acc;
  }, {} as Record<string, any>);
};

// const flattenOneTrustQuestionResponses = (
//   questionResponses: OneTrustAssessmentQuestionResponsesCodec[],
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

// const flattenOneTrustQuestion = (
//   oneTrustQuestion: OneTrustAssessmentQuestionCodec,
//   prefix: string,
// ): any => {
//   const {
//     question: { options: questionOptions, ...restQuestion },
//     questionResponses,
//     // risks,
//     ...rest
//   } = oneTrustQuestion;
//   const newPrefix = `${prefix}_${restQuestion.sequence}`;

//   return {
//     ...flattenObject({ ...restQuestion, ...rest }, newPrefix),
//     ...flattenList(questionOptions ?? [], `${newPrefix}_options`),
//     ...flattenOneTrustQuestionResponses(
//       questionResponses ?? [],
//       `${newPrefix}_responses`,
//     ),
//   };
// };

// const flattenOneTrustQuestions = (
//   questions: OneTrustAssessmentQuestionCodec[],
//   prefix: string,
// ): any =>
//   questions.reduce(
//     (acc, question) => ({
//       ...acc,
//       ...flattenOneTrustQuestion(question, prefix),
//     }),
//     {},
//   );

// const flattenOneTrustSection = (
//   section: OneTrustAssessmentSectionCodec,
// ): any => {
//   const { questions, header, ...rest } = section;

//   // the flattened section key has format like sections_${sequence}_sectionId
//   const prefix = `sections_${section.sequence}`;
//   return {
//     ...flattenObject({ ...header, ...rest }, prefix),
//     ...flattenOneTrustQuestions(questions, `${prefix}_questions`),
//   };
// };

// const flattenOneTrustSections = (
//   sections: OneTrustAssessmentSectionCodec[],
// ): any =>
//   sections.reduce(
//     (acc, section) => ({ ...acc, ...flattenOneTrustSection(section) }),
//     {},
//   );

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
    //  allQuestions,
    headers,
    unnestedSections,
  } = sections.reduce<{
    /** The sections questions */
    allQuestions: OneTrustAssessmentQuestionCodec[][];
    /** The sections headers */
    headers: OneTrustAssessmentSectionHeaderCodec[];
    /** The sections */
    unnestedSections: OneTrustFlatAssessmentSectionCodec[];
  }>(
    (acc, section) => {
      const { questions, header, ...rest } = section;
      return {
        allQuestions: [...acc.allQuestions, questions],
        headers: [...acc.headers, header],
        unnestedSections: [...acc.unnestedSections, rest],
      };
    },
    {
      allQuestions: [],
      headers: [],
      unnestedSections: [],
    },
  );
  const flattenedSections = flattenList(unnestedSections, prefix);
  const flattenedHeaders = flattenOneTrustSectionHeaders(headers, prefix);

  return { ...flattenedSections, ...flattenedHeaders };
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
