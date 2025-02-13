import { GraphQLClient } from 'graphql-request';
import { PURPOSES } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

export interface Purpose {
  /** ID of purpose */
  id: string;
  /** Name of purpose */
  name: string;
  /** Slug of purpose */
  trackingType: string;
  /** Whether the purpose is active */
  isActive: boolean;
  /** Whether the purpose is deleted */
  deletedAt?: string;
}

const PAGE_SIZE = 20;

/**
 * Fetch all purposes in the organization
 *
 * @param client - GraphQL client
 * @param input - Input
 * @returns All purposes in the organization
 */
export async function fetchAllPurposes(
  client: GraphQLClient,
  {
    includeDeleted = false,
  }: {
    /** Whether to include deleted purposes */
    includeDeleted?: boolean;
  } = {},
): Promise<Purpose[]> {
  const purposes: Purpose[] = [];
  let offset = 0;

  // Whether to continue looping
  let shouldContinue = false;
  do {
    const {
      purposes: { nodes },
      // eslint-disable-next-line no-await-in-loop
    } = await makeGraphQLRequest<{
      /** Purposes */
      purposes: {
        /** List */
        nodes: Purpose[];
      };
    }>(client, PURPOSES, {
      first: PAGE_SIZE,
      offset,
      input: {
        includeDeleted,
      },
    });
    purposes.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return purposes.sort((a, b) => a.trackingType.localeCompare(b.trackingType));
}
