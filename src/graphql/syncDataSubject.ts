import { DataSubjectInput } from '../codecs';
import { GraphQLClient } from 'graphql-request';
import { UPDATE_DATA_SUBJECT, TOGGLE_DATA_SUBJECT } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import { sleepPromise } from './sleepPromise';

/**
 * Sync the consent manager
 *
 * @param client - GraphQL client
 * @param options - Options
 */
export async function syncDataSubject(
  client: GraphQLClient,
  {
    dataSubject,
    dataSubjectId,
  }: {
    /** DataSubject update input */
    dataSubject: DataSubjectInput;
    /** Existing data subject Id */
    dataSubjectId: string;
  },
): Promise<void> {
  await makeGraphQLRequest(client, UPDATE_DATA_SUBJECT, {
    input: {
      id: dataSubjectId,
      title: dataSubject.title,
      adminDashboardDefaultSilentMode:
        dataSubject.adminDashboardDefaultSilentMode,
      actions: dataSubject.actions,
    },
  });

  if (typeof dataSubject.active === 'boolean') {
    // TODO: https://transcend.height.app/T-23578 - bulk update with single invalidation
    await sleepPromise(1000 * 3);
    await makeGraphQLRequest(client, TOGGLE_DATA_SUBJECT, {
      input: {
        id: dataSubjectId,
        active: dataSubject.active,
      },
    });
  }

  // TODO: https://transcend.height.app/T-23578 - bulk update with single invalidation
  await sleepPromise(1000 * 3);
}
