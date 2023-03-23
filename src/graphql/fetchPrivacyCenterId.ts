import { GraphQLClient } from 'graphql-request';
import { FETCH_PRIVACY_CENTER_ID } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

/**
 * Fetch privacy center ID
 *
 * @param client - GraphQL client
 * @returns Privacy Center ID in organization
 */
export async function fetchPrivacyCenterId(
  client: GraphQLClient,
): Promise<string> {
  const { privacyCenter } = await makeGraphQLRequest<{
    /** Privacy Center query */
    privacyCenter: {
      /** ID of bundle */
      id: string;
    };
  }>(client, FETCH_PRIVACY_CENTER_ID);
  return privacyCenter.id;
}
