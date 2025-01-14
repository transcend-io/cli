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
  const allOptionsFlat = allOptions.map((options) =>
    flattenObject({ obj: { options }, prefix }),
  );
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

  return {
    ...flattenObject({ obj: { questions: restQuestions }, prefix }),
    ...flattenOneTrustNestedQuestionsOptions(allOptions, `${prefix}_questions`),
  };
};

// flatten questionResponses of every question within a section
const flattenOneTrustQuestionResponses = (
  allQuestionResponses: OneTrustAssessmentQuestionResponses[],
  prefix: string,
): any => {
  const allQuestionResponsesFlat = allQuestionResponses.map((qrs) => {
    const { responses, rest: questionResponses } = extractProperties(
      qrs.map((q) => ({
        ...q,
        // there is always just one response within responses
        responses: q.responses[0],
      })),
      ['responses'],
    );

    const responsesFlat = (responses ?? []).map((r) =>
      flattenObject({ obj: r, prefix: `${prefix}_questionResponses` }),
    );
    return {
      ...aggregateObjects({ objs: responsesFlat }),
      ...flattenObject({ obj: { questionResponses }, prefix }),
    };
  });
  return aggregateObjects({ objs: allQuestionResponsesFlat, wrap: true });
};

const flattenOneTrustRiskCategories = (
  allCategories: OneTrustRiskCategories[],
  prefix: string,
): any => {
  const allCategoriesFlat = (allCategories ?? []).map((categories) =>
    flattenObject({ obj: { categories }, prefix }),
  );
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
      flattenObject({ obj: r, prefix: `${prefix}_risks` }),
    );
    return {
      ...aggregateObjects({ objs: flatRisks }),
      ...flattenOneTrustRiskCategories(categories, `${prefix}_risks`),
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
        flattenObject({ obj: q, prefix: `${prefix}_questions` }),
      );

      return {
        ...aggregateObjects({ objs: restSectionQuestionsFlat }),
        ...flattenOneTrustNestedQuestions(questions, prefix),
        ...flattenOneTrustRisks(allRisks, `${prefix}_questions`),
        ...flattenOneTrustQuestionResponses(
          allQuestionResponses,
          `${prefix}_questions`,
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
): any => {
  const {
    questions: allQuestions,
    header: headers,
    rest: restSections,
  } = extractProperties(sections, ['questions', 'header']);

  const sectionsFlat = flattenObject({ obj: { sections: restSections } });
  const headersFlat = flattenOneTrustSectionHeaders(headers, 'sections');
  const questionsFlat = flattenOneTrustQuestions(allQuestions, 'sections');

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
    ...flattenOneTrustSections(sections),
  };
};
