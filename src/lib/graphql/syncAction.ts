import { ActionInput } from '../../codecs';
import { GraphQLClient } from 'graphql-request';
import { UPDATE_ACTION } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import difference from 'lodash/difference';
import {
  IsoCountryCode,
  IsoCountrySubdivisionCode,
} from '@transcend-io/privacy-types';

const ALL_COUNTRIES_AND_SUBDIVISIONS = [
  ...Object.values(IsoCountryCode),
  ...Object.values(IsoCountrySubdivisionCode),
];

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
    skipPublish = false,
  }: {
    /** Action update input */
    action: ActionInput;
    /** Existing action Id */
    actionId: string;
    /** When true, skip publishing to privacy center */
    skipPublish?: boolean;
  },
): Promise<void> {
  await makeGraphQLRequest(client, UPDATE_ACTION, {
    input: {
      id: actionId,
      skipSecondaryIfNoFiles: action.skipSecondaryIfNoFiles,
      skipDownloadableStep: action.skipDownloadableStep,
      requiresReview: action.requiresReview,
      waitingPeriod: action.waitingPeriod,
      skipPublish,
      regionList: action.regionBlockList
        ? difference(ALL_COUNTRIES_AND_SUBDIVISIONS, action.regionBlockList)
        : action.regionList,
      regionDetectionMethod: action.regionDetectionMethod,
    },
  });
}
