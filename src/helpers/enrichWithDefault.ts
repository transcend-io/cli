import * as t from 'io-ts';
import {
  OneTrustAssessmentNestedQuestion,
  OneTrustAssessmentQuestionOption,
  OneTrustAssessmentQuestionResponses,
  OneTrustAssessmentResponses,
  OneTrustAssessmentSectionHeaderRiskStatistics,
  OneTrustAssessmentSectionSubmittedBy,
  OneTrustPrimaryEntityDetails,
} from '@transcend-io/privacy-types';

import {
  OneTrustCombinedAssessment,
  OneTrustEnrichedAssessmentSection,
  OneTrustEnrichedRisk,
  OneTrustEnrichedRisks,
} from '../oneTrust/codecs';
import { createDefaultCodec } from './createDefaultCodec';

// TODO: test the shit out of this
const enrichQuestionWithDefault = ({
  options,
  ...rest
}: OneTrustAssessmentNestedQuestion): OneTrustAssessmentNestedQuestion => ({
  options:
    options === null || options.length === 0
      ? createDefaultCodec(t.array(OneTrustAssessmentQuestionOption))
      : options,
  ...rest,
});

// TODO: test the shit out of this
const enrichQuestionResponsesWithDefault = (
  questionResponses: OneTrustAssessmentQuestionResponses,
): OneTrustAssessmentQuestionResponses =>
  questionResponses.length === 0
    ? createDefaultCodec(OneTrustAssessmentQuestionResponses)
    : questionResponses.map((questionResponse) => ({
        ...questionResponse,
        responses:
          questionResponse.responses.length === 0
            ? createDefaultCodec(OneTrustAssessmentResponses)
            : questionResponse.responses,
      }));

// TODO: test the shit out of this
const enrichRisksWithDefault = (
  risks: OneTrustEnrichedRisks,
): OneTrustEnrichedRisks =>
  risks === null || risks.length === 0
    ? createDefaultCodec(t.array(OneTrustEnrichedRisk))
    : risks;

// TODO: test the shit out of this
const enrichRiskStatisticsWithDefault = (
  riskStatistics: OneTrustAssessmentSectionHeaderRiskStatistics,
): OneTrustAssessmentSectionHeaderRiskStatistics =>
  riskStatistics === null
    ? createDefaultCodec(OneTrustAssessmentSectionHeaderRiskStatistics)
    : riskStatistics;

// TODO: test the shit out of this
const enrichSectionsWithDefault = (
  sections: OneTrustEnrichedAssessmentSection[],
): OneTrustEnrichedAssessmentSection[] =>
  sections.map((s) => ({
    ...s,
    header: {
      ...s.header,
      riskStatistics: enrichRiskStatisticsWithDefault(s.header.riskStatistics),
    },
    questions: s.questions.map((q) => ({
      ...q,
      question: enrichQuestionWithDefault(q.question),
      questionResponses: enrichQuestionResponsesWithDefault(
        q.questionResponses,
      ),
      risks: enrichRisksWithDefault(q.risks),
    })),
    submittedBy:
      s.submittedBy === null
        ? createDefaultCodec(OneTrustAssessmentSectionSubmittedBy)
        : s.submittedBy,
  }));

const enrichPrimaryEntityDetailsWithDefault = (
  primaryEntityDetails: OneTrustPrimaryEntityDetails,
): OneTrustPrimaryEntityDetails =>
  primaryEntityDetails.length === 0
    ? createDefaultCodec(OneTrustPrimaryEntityDetails)
    : primaryEntityDetails;

export const enrichCombinedAssessmentWithDefaults = (
  combinedAssessment: OneTrustCombinedAssessment,
): OneTrustCombinedAssessment => ({
  ...combinedAssessment,
  primaryEntityDetails: enrichPrimaryEntityDetailsWithDefault(
    combinedAssessment.primaryEntityDetails,
  ),
  sections: enrichSectionsWithDefault(combinedAssessment.sections),
});
