import { GraphQLClient } from 'graphql-request';
import { GLOBAL_ACTION_ITEM_COLLECTIONS } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import { ActionItemCollectionLocation } from '@transcend-io/privacy-types';

export interface ActionItemCollection {
  /** ID of collection */
  id: string;
  /** Title of collection */
  title: string;
  /** Description of collection */
  description: string;
  /** Whether section is hidden */
  hidden: boolean;
  /** Which locations/products the action item shows up in */
  productLine: ActionItemCollectionLocation;
}

/**
 * Fetch all action item collections in the organization
 *
 * @param client - GraphQL client
 * @param filterBy - Filter by
 * @returns All action item collections in the organization
 */
export async function fetchAllActionItemCollections(
  client: GraphQLClient,
  filterBy: {
    /** Filter on location */
    location?: ActionItemCollectionLocation;
  } = {},
): Promise<ActionItemCollection[]> {
  const {
    globalActionItemCollections: { nodes },
  } = await makeGraphQLRequest<{
    /** ActionItemCollections */
    globalActionItemCollections: {
      /** List */
      nodes: ActionItemCollection[];
    };
  }>(client, GLOBAL_ACTION_ITEM_COLLECTIONS, {
    filterBy: {
      ...filterBy,
    },
  });
  return nodes;
}
