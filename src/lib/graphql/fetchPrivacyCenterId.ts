import { GraphQLClient } from 'graphql-request';
import { DEPLOYED_PRIVACY_CENTER_URL, FETCH_PRIVACY_CENTER_ID } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

/**
 * Fetch default privacy center URL
 *
 * @param client - GraphQL client
 * @returns Privacy Center ID in organization
 */
export async function fetchPrivacyCenterUrl(
  client: GraphQLClient,
): Promise<string> {
  const { organization } = await makeGraphQLRequest<{
    /** Organization */
    organization: {
      /** URL */
      deployedPrivacyCenterUrl: string;
    };
  }>(client, DEPLOYED_PRIVACY_CENTER_URL);
  return organization.deployedPrivacyCenterUrl;
}

/**
 * Fetch privacy center ID
 *
 * @param client - GraphQL client
 * @param url - URLto lookup
 * @returns Privacy Center ID in organization
 */
export async function fetchPrivacyCenterId(
  client: GraphQLClient,
  url?: string,
): Promise<string> {
  let urlToUse = url;
  if (!urlToUse) {
    urlToUse = await fetchPrivacyCenterUrl(client);
  }
  const { privacyCenter } = await makeGraphQLRequest<{
    /** Privacy Center query */
    privacyCenter: {
      /** ID of bundle */
      id: string;
    };
  }>(client, FETCH_PRIVACY_CENTER_ID, {
    url: urlToUse,
  });
  return privacyCenter.id;
}
