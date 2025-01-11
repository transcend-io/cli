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

const flattenList = (list: any[], prefix: string): any => {
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
        rest: restSectionQuestions,
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

  const flatFlatHeaders = flatHeaders.map((h) => flattenObject(h, prefix));
  return {
    ...aggregateObjects({ objs: flatFlatHeaders }),
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
