import { Got } from 'got';
import { OneTrustGetAssessmentResponseCodec } from './codecs';
import { decodeCodec } from '@transcend-io/type-utils';

/**
 * Retrieve details about a particular assessment.
 * ref: https://developer.onetrust.com/onetrust/reference/exportassessmentusingget
 *
 * @param param - the information about the OneTrust client and assessment to retrieve
 * @returns details about the assessment
 */
export const getOneTrustAssessment = async ({
  oneTrust,
  assessmentId,
}: {
  /** The OneTrust client instance */
  oneTrust: Got;
  /** The ID of the assessment to retrieve */
  assessmentId: string;
}): Promise<OneTrustGetAssessmentResponseCodec> => {
  const { body } = await oneTrust.get(
    `api/assessment/v2/assessments/${assessmentId}/export?ExcludeSkippedQuestions=false`,
  );

  return decodeCodec(OneTrustGetAssessmentResponseCodec, body);
};
