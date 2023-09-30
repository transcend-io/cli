import { DataSubjectInput } from '../codecs';
import { GraphQLClient } from 'graphql-request';
import { UPDATE_DATA_SUBJECT, TOGGLE_DATA_SUBJECT } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

/**
 * Sync the data subjects
 *
 * @param client - GraphQL client
 * @param options - Options
 */
export async function syncDataSubject(
  client: GraphQLClient,
  {
    dataSubject,
    dataSubjectId,
    skipPublish = false,
  }: {
    /** DataSubject update input */
    dataSubject: DataSubjectInput;
    /** Existing data subject Id */
    dataSubjectId: string;
    /** When true, skip publishing to privacy center */
    skipPublish?: boolean;
  },
): Promise<void> {
  await makeGraphQLRequest(client, UPDATE_DATA_SUBJECT, {
    input: {
      id: dataSubjectId,
      title: dataSubject.title,
      adminDashboardDefaultSilentMode:
        dataSubject.adminDashboardDefaultSilentMode,
      actions: dataSubject.actions,
      skipPublish: skipPublish && typeof dataSubject.active === 'undefined',
    },
  });

  if (typeof dataSubject.active === 'boolean') {
    await makeGraphQLRequest(client, TOGGLE_DATA_SUBJECT, {
      input: {
        id: dataSubjectId,
        active: dataSubject.active,
        skipPublish,
      },
    });
  }
}
