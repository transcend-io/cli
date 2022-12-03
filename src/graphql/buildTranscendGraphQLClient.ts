import { GraphQLClient } from 'graphql-request';

/**
 * Create a GraphQL client
 *
 * @param transcendUrl - Transcend API URL
 * @param auth - API key to authenticate to API
 * @returns GraphQL client
 */
export function buildTranscendGraphQLClient(
  transcendUrl: string,
  auth: string,
): GraphQLClient {
  // Create a GraphQL client
  // eslint-disable-next-line global-require
  const { version } = require('../../package.json');
  return new GraphQLClient(`${transcendUrl}/graphql`, {
    headers: {
      Authorization: `Bearer ${auth}`,
      version,
    },
  });
}
