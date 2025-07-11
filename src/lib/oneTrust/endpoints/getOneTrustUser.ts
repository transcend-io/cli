import { Got } from 'got';
import { decodeCodec } from '@transcend-io/type-utils';
import { OneTrustGetUserResponse } from '@transcend-io/privacy-types';

/**
 * Retrieve details about a particular user.
 * ref: https://developer.onetrust.com/onetrust/reference/getriskusingget
 *
 * @param param - the information about the OneTrust client and risk to retrieve
 * @returns the OneTrust risk
 */
export const getOneTrustUser = async ({
  oneTrust,
  userId,
}: {
  /** The OneTrust client instance */
  oneTrust: Got;
  /** The ID of the OneTrust user to retrieve */
  userId: string;
}): Promise<OneTrustGetUserResponse> => {
  const { body } = await oneTrust.get(`api/scim/v2/Users/${userId}`);

  return decodeCodec(OneTrustGetUserResponse, body);
};
