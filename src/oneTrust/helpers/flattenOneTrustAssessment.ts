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
import { flattenObject } from './flattenObject';
import { aggregateObjects } from './aggregateObjects';

const flattenOneTrustNestedQuestionsOptions = (
  allOptions: (OneTrustAssessmentQuestionOption[] | null)[],
  prefix: string,
): any => {
  const allOptionsFlat = allOptions.map((options) => {
    const flatOptions = (options ?? []).map((o) =>
      flattenObject({ obj: o, prefix }),
    );
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

  const restQuestionsFlat = restQuestions.map((r) =>
    flattenObject({ obj: r, prefix }),
  );
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
        flattenObject({ obj: r, prefix }),
      );
      const restQuestionResponsesFlat = (restQuestionResponses ?? []).map((q) =>
        flattenObject({ obj: q, prefix }),
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
    const flatCategories = categories.map((c) =>
      flattenObject({ obj: c, prefix }),
    );
    return aggregateObjects({ objs: flatCategories });
  });
  return aggregateObjects({ objs: allCategoriesFlat, wrap: true });
};

const flattenOneTrustRisks = (
  allRisks: (OneTrustEnrichedRisk[] | null)[],
  prefix: string,
): any => {
  const allRisksFlat = (allRisks ?? []).map((risks) => {
    const { categories, rest: restRisks } = extractProperties(risks ?? [], [
      'categories',
    ]);

    const flatRisks = (restRisks ?? []).map((r) =>
      flattenObject({ obj: r, prefix }),
    );
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
        flattenObject({ obj: q, prefix }),
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

  const flatFlatHeaders = restHeaders.map((h) =>
    flattenObject({ obj: h, prefix }),
  );
  return {
    ...aggregateObjects({ objs: flatFlatHeaders }),
    ...flattenObject({ obj: { riskStatistics }, prefix }),
  };
};

const flattenOneTrustSections = (
  sections: OneTrustEnrichedAssessmentSection[],
  prefix: string,
): any => {
  const {
    questions: allQuestions,
    header: headers,
    rest: restSections,
  } = extractProperties(sections, ['questions', 'header']);

  const sectionsFlat = flattenObject({ obj: { sections: restSections } });
  const headersFlat = flattenOneTrustSectionHeaders(headers, prefix);
  const questionsFlat = flattenOneTrustQuestions(
    allQuestions,
    `${prefix}_questions`,
  );

  return { ...sectionsFlat, ...headersFlat, ...questionsFlat };
};

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

  return {
    ...flattenObject({ obj: rest }),
    ...flattenObject({ obj: { approvers } }),
    ...flattenObject({ obj: { respondents } }),
    ...flattenObject({ obj: { primaryEntityDetails } }),
    ...flattenOneTrustSections(sections, 'sections'),
  };
};
