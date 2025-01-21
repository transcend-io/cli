import {
  OneTrustAssessment,
  OneTrustGetAssessmentResponse,
  OneTrustGetRiskResponse,
} from '@transcend-io/privacy-types';
import keyBy from 'lodash/keyBy';
import { OneTrustEnrichedAssessment } from '../codecs';
import { OneTrustGetUserResponse } from '../endpoints';

/**
 * Merge the assessment, assessmentDetails, and riskDetails into one object.
 *
 * @param param - the assessment and risk information
 * @returns the assessment enriched with details and risk information
 */
export const enrichOneTrustAssessment = ({
  assessment,
  assessmentDetails,
  riskDetails,
  creatorDetails,
}: {
  /** The OneTrust risk details */
  riskDetails: OneTrustGetRiskResponse[];
  /** The OneTrust assessment as returned from Get List of Assessments endpoint */
  assessment: OneTrustAssessment;
  /** The OneTrust assessment details */
  assessmentDetails: OneTrustGetAssessmentResponse;
  /** The OneTrust assessment creator details */
  creatorDetails: OneTrustGetUserResponse;
}): OneTrustEnrichedAssessment => {
  const riskDetailsById = keyBy(riskDetails, 'id');
  const { sections, createdBy, ...restAssessmentDetails } = assessmentDetails;
  const sectionsWithEnrichedRisk = sections.map((section) => {
    const { questions, ...restSection } = section;
    const enrichedQuestions = questions.map((question) => {
      const { risks, ...restQuestion } = question;
      const enrichedRisks = (risks ?? []).map((risk) => {
        const details = riskDetailsById[risk.riskId];
        // FIXME: missing the risk meta data and links to the assessment
        return {
          ...risk,
          description: details.description,
          name: details.name,
          treatment: details.treatment,
          treatmentStatus: details.treatmentStatus,
          type: details.type,
          state: details.state,
          stage: details.stage,
          result: details.result,
          categories: details.categories,
        };
      });
      return {
        ...restQuestion,
        risks: enrichedRisks,
      };
    });
    return {
      ...restSection,
      questions: enrichedQuestions,
    };
  });

  const enrichedCreatedBy = {
    ...createdBy,
    ...creatorDetails,
  };

  // combine the two assessments into a single enriched result

  return {
    ...assessment,
    ...restAssessmentDetails,
    createdBy: enrichedCreatedBy,
    sections: sectionsWithEnrichedRisk,
  };
};
