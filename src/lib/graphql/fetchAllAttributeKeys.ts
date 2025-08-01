import { GraphQLClient } from 'graphql-request';
import { ATTRIBUTE_KEYS_REQUESTS } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

export interface AttributeKey {
  /** ID of attribute key */
  id: string;
  /** Name of attribute key */
  name: string;
  /** Attribute key type */
  type: string;
}

const PAGE_SIZE = 20;

/**
 * Fetch all attribute keys enabled for privacy requests
 *
 * @param client - GraphQL client
 * @returns All attribute keys in the organization
 */
export async function fetchAllRequestAttributeKeys(
  client: GraphQLClient,
): Promise<AttributeKey[]> {
  const attributeKeys: AttributeKey[] = [];
  let offset = 0;

  // Whether to continue looping
  let shouldContinue = false;
  do {
    const {
      attributeKeys: { nodes },
    } = await makeGraphQLRequest<{
      /** Query response */
      attributeKeys: {
        /** List of matches */
        nodes: AttributeKey[];
      };
    }>(client, ATTRIBUTE_KEYS_REQUESTS, {
      first: PAGE_SIZE,
      offset,
    });
    attributeKeys.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return attributeKeys.sort((a, b) => a.name.localeCompare(b.name));
}
