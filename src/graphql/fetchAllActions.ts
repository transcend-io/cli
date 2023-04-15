import { GraphQLClient } from 'graphql-request';
import { RequestAction } from '@transcend-io/privacy-types';
import { ACTIONS } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

export interface Action {
  /** ID of identifier */
  id: string;
  /** Type of action */
  type: RequestAction;
  /** Whether to skip secondary when no files exist */
  skipSecondaryIfNoFiles: boolean;
  /** Whether to skip downloadable step */
  skipDownloadableStep: boolean;
  /** Whether action requires review */
  requiresReview: boolean;
  /** Waiting period for action */
  waitingPeriod: number;
}

const PAGE_SIZE = 20;

/**
 * Fetch all actions in the organization
 *
 * @param client - GraphQL client
 * @returns All actions in the organization
 */
export async function fetchAllActions(
  client: GraphQLClient,
): Promise<Action[]> {
  const actions: Action[] = [];
  let offset = 0;

  // Try to fetch an enricher with the same title
  let shouldContinue = false;
  do {
    const {
      actions: { nodes },
      // eslint-disable-next-line no-await-in-loop
    } = await makeGraphQLRequest<{
      /** Actions */
      actions: {
        /** List */
        nodes: Action[];
      };
    }>(client, ACTIONS, {
      first: PAGE_SIZE,
      offset,
    });
    actions.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return actions;
}
