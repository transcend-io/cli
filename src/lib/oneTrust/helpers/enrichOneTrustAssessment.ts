import {
  OneTrustAssessment,
  OneTrustEnrichedAssessment,
  OneTrustGetAssessmentResponse,
  OneTrustGetRiskResponse,
  OneTrustGetUserResponse,
} from '@transcend-io/privacy-types';
import { keyBy } from 'lodash-es';

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
  approversDetails,
  respondentsDetails,
}: {
  /** The OneTrust risk details */
  riskDetails: OneTrustGetRiskResponse[];
  /** The OneTrust assessment as returned from Get List of Assessments endpoint */
  assessment: OneTrustAssessment;
  /** The OneTrust assessment details */
  assessmentDetails: OneTrustGetAssessmentResponse;
  /** The OneTrust assessment creator details */
  creatorDetails: OneTrustGetUserResponse;
  /** The OneTrust assessment approvers details */
  approversDetails: OneTrustGetUserResponse[];
  /** The OneTrust assessment internal respondents details */
  respondentsDetails: OneTrustGetUserResponse[];
}): OneTrustEnrichedAssessment => {
  const riskDetailsById = keyBy(riskDetails, 'id');
  const { sections, createdBy, ...restAssessmentDetails } = assessmentDetails;
  const sectionsWithEnrichedRisk = sections.map((section) => {
    const { questions, ...restSection } = section;
    const enrichedQuestions = questions.map((question) => {
      const { risks, ...restQuestion } = question;
      const enrichedRisks = (risks ?? []).map((risk) => {
        const details = riskDetailsById[risk.riskId];
        return {
          ...risk,
          ...details,
          level: risk.level,
          impactLevel: risk.impactLevel ?? 0,
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

  // grab creator details
  const enrichedCreatedBy = {
    ...createdBy,
    active: creatorDetails?.active ?? false,
    userType: creatorDetails?.userType ?? 'Internal',
    emails: creatorDetails?.emails ?? [],
    title: creatorDetails?.title ?? null,
    givenName: creatorDetails?.name.givenName ?? null,
    familyName: creatorDetails?.name.familyName ?? null,
  };

  // grab approvers details
  const approverDetailsById = keyBy(approversDetails, 'id');
  const enrichedApprovers = assessmentDetails.approvers.flatMap(
    (originalApprover) =>
      approverDetailsById[originalApprover.id]
        ? [
            {
              ...originalApprover,
              approver: {
                ...originalApprover.approver,
                active: approverDetailsById[originalApprover.id].active,
                userType: approverDetailsById[originalApprover.id].userType,
                emails: approverDetailsById[originalApprover.id].emails,
                title: approverDetailsById[originalApprover.id].title,
                givenName:
                  approverDetailsById[originalApprover.id].name.givenName ??
                  null,
                familyName:
                  approverDetailsById[originalApprover.id].name.familyName ??
                  null,
              },
            },
          ]
        : [],
  );

  // grab respondents details
  const respondentsDetailsById = keyBy(respondentsDetails, 'id');
  const enrichedRespondents = assessmentDetails.respondents
    .filter((r) => !r.name.includes('@')) // search only internal respondents
    .flatMap((respondent) =>
      respondentsDetailsById[respondent.id]
        ? [
            {
              ...respondent,
              active: respondentsDetailsById[respondent.id].active,
              userType: respondentsDetailsById[respondent.id].userType,
              emails: respondentsDetailsById[respondent.id].emails,
              title: respondentsDetailsById[respondent.id].title,
              givenName:
                respondentsDetailsById[respondent.id].name.givenName ?? null,
              familyName:
                respondentsDetailsById[respondent.id].name.familyName ?? null,
            },
          ]
        : [],
    );

  // combine everything into a single enriched assessment
  return {
    ...assessment,
    ...restAssessmentDetails,
    approvers: enrichedApprovers,
    respondents: enrichedRespondents,
    createdBy: enrichedCreatedBy,
    sections: sectionsWithEnrichedRisk,
  };
};
