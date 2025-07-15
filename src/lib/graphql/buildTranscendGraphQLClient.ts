import { GraphQLClient } from 'graphql-request';

/**
 * Create a GraphQL client
 *
 * @param transcendUrl - Transcend API URL
 * @param headers - Request headers to include in each request
 * @returns GraphQL client
 */
export function buildTranscendGraphQLClientGeneric(
  transcendUrl: string,
  headers: Record<string, string>,
): GraphQLClient {
  // Create a GraphQL client
  // eslint-disable-next-line global-require
  const { version } = require('../../package.json');
  return new GraphQLClient(`${transcendUrl}/graphql`, {
    headers: {
      ...headers,
      version,
    },
  });
}

/**
 * Create a GraphQL client capable of submitting requests with an API key
 *
 * @param transcendUrl - Transcend API URL
 * @param auth - API key to authenticate to API
 * @returns GraphQL client
 */
export function buildTranscendGraphQLClient(
  transcendUrl: string,
  auth: string,
): GraphQLClient {
  return buildTranscendGraphQLClientGeneric(transcendUrl, {
    Authorization: `Bearer ${auth}`,
  });
}
