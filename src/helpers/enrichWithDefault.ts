import * as t from 'io-ts';
import {
  OneTrustAssessmentNestedQuestionCodec,
  OneTrustAssessmentQuestionOptionCodec,
  OneTrustAssessmentQuestionResponseCodec,
  OneTrustAssessmentQuestionResponsesCodec,
  OneTrustAssessmentQuestionRiskCodec,
  OneTrustAssessmentQuestionRisksCodec,
  OneTrustAssessmentSectionCodec,
  OneTrustAssessmentSectionSubmittedByCodec,
  OneTrustPrimaryEntityDetailsCodec,
} from '../oneTrust/codecs';
import { createDefaultCodec } from './createDefaultCodec';

// TODO: test the shit out of this
const enrichQuestionWithDefault = ({
  options,
  ...rest
}: OneTrustAssessmentNestedQuestionCodec): OneTrustAssessmentNestedQuestionCodec => ({
  options:
    options === null || options.length === 0
      ? createDefaultCodec(t.array(OneTrustAssessmentQuestionOptionCodec))
      : options,
  ...rest,
});

// TODO: test the shit out of this
const enrichQuestionResponsesWithDefault = (
  questionResponses: OneTrustAssessmentQuestionResponsesCodec,
): OneTrustAssessmentQuestionResponsesCodec =>
  questionResponses.length === 0
    ? createDefaultCodec(t.array(OneTrustAssessmentQuestionResponseCodec))
    : questionResponses;

// TODO: test the shit out of this
const enrichRisksWithDefault = (
  risks: OneTrustAssessmentQuestionRisksCodec,
): OneTrustAssessmentQuestionRisksCodec =>
  risks === null || risks.length === 0
    ? createDefaultCodec(t.array(OneTrustAssessmentQuestionRiskCodec))
    : risks;

// TODO: test the shit out of this
export const enrichSectionsWithDefault = (
  sections: OneTrustAssessmentSectionCodec[],
): OneTrustAssessmentSectionCodec[] =>
  sections.map((s) => ({
    ...s,
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
        ? createDefaultCodec(OneTrustAssessmentSectionSubmittedByCodec)
        : s.submittedBy,
  }));

export const enrichPrimaryEntityDetailsWithDefault = (
  primaryEntityDetails: OneTrustPrimaryEntityDetailsCodec,
): OneTrustPrimaryEntityDetailsCodec =>
  primaryEntityDetails.length === 0
    ? createDefaultCodec(OneTrustPrimaryEntityDetailsCodec)
    : primaryEntityDetails;
