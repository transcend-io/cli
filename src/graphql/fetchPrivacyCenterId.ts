import { GraphQLClient } from 'graphql-request';
import { FETCH_PRIVACY_CENTER_ID } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

/**
 * Fetch privacy center ID
 *
 * @param client - GraphQL client
 * @param url - URLto lookup
 * @returns Privacy Center ID in organization
 */
export async function fetchPrivacyCenterId(
  client: GraphQLClient,
<<<<<<< HEAD
  url: string,
=======
  url?: string,
>>>>>>> main
): Promise<string> {
  const { privacyCenter } = await makeGraphQLRequest<{
    /** Privacy Center query */
    privacyCenter: {
      /** ID of bundle */
      id: string;
    };
  }>(client, FETCH_PRIVACY_CENTER_ID, {
    url,
  });
  return privacyCenter.id;
}
