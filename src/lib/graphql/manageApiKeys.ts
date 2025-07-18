import { ScopeName } from '@transcend-io/privacy-types';
import { GraphQLClient } from 'graphql-request';
import { CREATE_API_KEY, DELETE_API_KEY } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

export interface CreatedApiKey {
  /** ID of API key */
  id: string;
  /** Actual API key */
  apiKey: string;
  /** Title of the API key */
  title: string;
}

/**
 * Create an API key
 *
 * @param client - GraphQL client
 * @param input - Input
 * @returns The API key
 */
export async function createApiKey(
  client: GraphQLClient,
  input: {
    /** Title of API key */
    title: string;
    /** Scopes for API key */
    scopes: ScopeName[];
  },
): Promise<CreatedApiKey> {
  const {
    createApiKey: { apiKey },
  } = await makeGraphQLRequest<{
    /** Create API key */
    createApiKey: {
      /** API key */
      apiKey: CreatedApiKey;
    };
  }>(client, CREATE_API_KEY, { input });

  return apiKey;
}

/**
 * Delete an API key
 *
 * @param client - GraphQL client
 * @param id - API key Id
 */
export async function deleteApiKey(
  client: GraphQLClient,
  id: string,
): Promise<void> {
  await makeGraphQLRequest(client, DELETE_API_KEY, { id });
}
