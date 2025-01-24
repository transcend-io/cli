// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  OneTrustAssessmentNestedQuestion,
  OneTrustAssessmentQuestionOption,
  OneTrustAssessmentQuestionResponses,
  OneTrustAssessmentResponses,
  OneTrustAssessmentSectionHeader,
  OneTrustAssessmentSectionHeaderRiskStatistics,
  OneTrustEnrichedAssessment,
  OneTrustEnrichedAssessmentQuestion,
  OneTrustEnrichedAssessmentSection,
  OneTrustEnrichedRisk,
  OneTrustRiskCategories,
} from '@transcend-io/privacy-types';

import {
  flattenObject,
  aggregateObjects,
  transposeObjectArray,
  createDefaultCodec,
} from '@transcend-io/type-utils';
import { convertToEmptyStrings } from './convertToEmptyStrings';

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
  const { options: allOptions, rest: restQuestions } = transposeObjectArray(
    questions,
    ['options'],
  );

  const defaultQuestionResponses = convertToEmptyStrings(
    createDefaultCodec(OneTrustAssessmentQuestionOption),
  ) as OneTrustAssessmentQuestionOption;

  const allOptionsWithDefault = allOptions.map((questionOptions) =>
    !questionOptions || questionOptions.length === 0
      ? [defaultQuestionResponses]
      : questionOptions,
  );

  return {
    ...flattenObject({ obj: { questions: restQuestions }, prefix }),
    ...flattenOneTrustNestedQuestionsOptions(
      allOptionsWithDefault,
      `${prefix}_questions`,
    ),
  };
};

const flattenOneTrustRiskCategories = (
  allCategories: OneTrustRiskCategories[],
  prefix: string,
): any => {
  const defaultRiskCategories = convertToEmptyStrings(
    createDefaultCodec(OneTrustRiskCategories),
  ) as OneTrustRiskCategories;

  const allCategoriesFlat = allCategories.map((categories) =>
    !categories
      ? {}
      : flattenObject({
          obj: {
            categories:
              categories.length === 0 ? defaultRiskCategories : categories,
          },
          prefix,
        }),
  );
  return aggregateObjects({ objs: allCategoriesFlat, wrap: true });
};

const flattenOneTrustRisks = (
  allRisks: (OneTrustEnrichedRisk[] | null)[],
  prefix: string,
): any => {
  const allRisksFlat = (allRisks ?? []).map((ars) => {
    const { categories: allCategories, rest: risks } = transposeObjectArray(
      ars ?? [],
      ['categories'],
    );

    return {
      ...(risks && flattenObject({ obj: { risks }, prefix })),
      ...(allCategories &&
        flattenOneTrustRiskCategories(allCategories, `${prefix}_risks`)),
    };
  });

  return aggregateObjects({ objs: allRisksFlat, wrap: true });
};

const flattenOneTrustQuestionResponses = (
  allQuestionResponses: OneTrustAssessmentQuestionResponses[],
  prefix: string,
): any => {
  const allQuestionResponsesFlat = allQuestionResponses.map((qrs) => {
    const defaultQuestionResponses = convertToEmptyStrings(
      createDefaultCodec(OneTrustAssessmentQuestionResponses),
    ) as OneTrustAssessmentQuestionResponses;

    const defaultResponses = convertToEmptyStrings(
      createDefaultCodec(OneTrustAssessmentResponses),
    ) as OneTrustAssessmentResponses;

    const { responses, rest: questionResponses } = transposeObjectArray(
      (qrs.length === 0 ? defaultQuestionResponses : qrs).map((q) => ({
        ...q,
        // there is always at most one response within responses
        responses: q.responses[0] ?? defaultResponses[0],
      })),
      ['responses'],
    );

    return {
      ...flattenObject({ obj: { questionResponses: responses }, prefix }),
      ...flattenObject({ obj: { questionResponses }, prefix }),
    };
  });

  return aggregateObjects({ objs: allQuestionResponsesFlat, wrap: true });
};

export const flattenOneTrustQuestions = (
  allSectionQuestions: OneTrustEnrichedAssessmentQuestion[][],
  prefix: string,
): any => {
  const allSectionQuestionsFlat = allSectionQuestions.map(
    (sectionQuestions) => {
      const {
        rest: questions,
        question: nestedQuestions,
        questionResponses: allQuestionResponses,
        risks: allRisks,
      } = transposeObjectArray(sectionQuestions, [
        'question',
        'questionResponses',
        'risks',
      ]);

      const defaultRisk = {
        ...convertToEmptyStrings(createDefaultCodec(OneTrustEnrichedRisk)),
        categories: null,
      } as OneTrustEnrichedRisk;
      const allRisksDefault = allRisks
        ? allRisks.map((risks) =>
            !risks || risks.length === 0 ? [defaultRisk] : risks,
          )
        : undefined;

      return {
        ...(questions && flattenObject({ obj: { questions }, prefix })),
        ...(nestedQuestions &&
          flattenOneTrustNestedQuestions(nestedQuestions, prefix)),
        ...(allRisksDefault &&
          flattenOneTrustRisks(allRisksDefault, `${prefix}_questions`)),
        ...(allQuestionResponses &&
          flattenOneTrustQuestionResponses(
            allQuestionResponses,
            `${prefix}_questions`,
          )),
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
  const { riskStatistics, rest: restHeaders } = transposeObjectArray(headers, [
    'riskStatistics',
  ]);
  const defaultRiskStatistics = convertToEmptyStrings(
    createDefaultCodec(OneTrustAssessmentSectionHeaderRiskStatistics),
  ) as OneTrustAssessmentSectionHeaderRiskStatistics;
  const riskStatisticsWithDefault = riskStatistics.map((rs) =>
    !rs ? defaultRiskStatistics : rs,
  );

  const flatFlatHeaders = (restHeaders ?? []).map((h) =>
    flattenObject({ obj: h, prefix }),
  );
  return {
    ...aggregateObjects({ objs: flatFlatHeaders }),
    ...(riskStatisticsWithDefault &&
      flattenObject({
        obj: { riskStatistics: riskStatisticsWithDefault },
        prefix,
      })),
  };
};

export const flattenOneTrustSections = (
  sections: OneTrustEnrichedAssessmentSection[],
): any => {
  // filter out sections without questions (shouldn't happen, but just to be safe)
  const sectionsWithQuestions = sections.filter((s) => s.questions.length > 0);
  const {
    questions: allQuestions,
    header: headers,
    rest: restSections,
  } = transposeObjectArray(sectionsWithQuestions, ['questions', 'header']);

  return {
    ...(restSections && flattenObject({ obj: { sections: restSections } })),
    ...(headers && flattenOneTrustSectionHeaders(headers, 'sections')),
    ...(allQuestions && flattenOneTrustQuestions(allQuestions, 'sections')),
  };
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
