import { Got } from 'got';
import { OneTrustGetRiskResponse } from './types';

/**
 * Retrieve details about a particular assessment.
 * ref: https://developer.onetrust.com/onetrust/reference/getriskusingget
 *
 * @param param - the information about the OneTrust client and assessment to retrieve
 * @returns details about the assessment
 */
export const getOneTrustRisk = async ({
  oneTrust,
  riskId,
}: {
  /** The OneTrust client instance */
  oneTrust: Got;
  /** The ID of the OneTrust risk to retrieve */
  riskId: string;
}): Promise<OneTrustGetRiskResponse> => {
  const { body } = await oneTrust.get(`api/risk/v2/risks/${riskId}`);

  return JSON.parse(body) as OneTrustGetRiskResponse;
};
