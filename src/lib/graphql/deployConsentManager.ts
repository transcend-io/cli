import { ConsentBundleType } from '@transcend-io/privacy-types';
import { GraphQLClient } from 'graphql-request';
import {
  UPDATE_CONSENT_MANAGER_TO_LATEST,
  DEPLOY_CONSENT_MANAGER,
} from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

/**
 * Deploy the Consent Manager
 *
 * @param client - GraphQL client
 * @param options - Options
 */
export async function deployConsentManager(
  client: GraphQLClient,
  {
    id,
    bundleType,
  }: {
    /** ID of Consent Manager */
    id: string;
    /** Type of bundle */
    bundleType: ConsentBundleType;
  },
): Promise<void> {
  await makeGraphQLRequest(client, DEPLOY_CONSENT_MANAGER, {
    airgapBundleId: id,
    bundleType,
  });
}

/**
 * Update the Consent Manager to the latest airgap.jz version
 *
 * @param client - GraphQL client
 * @param options - Options
 */
export async function updateConsentManagerToLatest(
  client: GraphQLClient,
  {
    id,
    bundleType,
  }: {
    /** ID of Consent Manager */
    id: string;
    /** Type of bundle */
    bundleType: ConsentBundleType;
  },
): Promise<void> {
  await makeGraphQLRequest(client, UPDATE_CONSENT_MANAGER_TO_LATEST, {
    airgapBundleId: id,
    bundleType,
  });
}
