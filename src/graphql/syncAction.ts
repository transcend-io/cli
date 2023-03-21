import { ActionInput } from '../codecs';
import { GraphQLClient } from 'graphql-request';
import { UPDATE_ACTION } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import { sleepPromise } from './sleepPromise';

/**
 * Sync the consent manager
 *
 * @param client - GraphQL client
 * @param options - Options
 */
export async function syncAction(
  client: GraphQLClient,
  {
    action,
    actionId,
  }: {
    /** Action update input */
    action: ActionInput;
    /** Existing action Id */
    actionId: string;
  },
): Promise<void> {
  await makeGraphQLRequest(client, UPDATE_ACTION, {
    input: {
      id: actionId,
      skipSecondaryIfNoFiles: action.skipSecondaryIfNoFiles,
      skipDownloadableStep: action.skipDownloadableStep,
      requiresReview: action.requiresReview,
      waitingPeriod: action.waitingPeriod,
    },
  });

  // TODO: https://transcend.height.app/T-23578 - bulk update with single invalidation
  await sleepPromise(1000 * 3);
}
