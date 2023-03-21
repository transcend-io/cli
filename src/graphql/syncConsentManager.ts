import { ConsentManagerInput } from '../codecs';
import { GraphQLClient } from 'graphql-request';
import { UPDATE_CONSENT_MANAGER_DOMAINS } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import { fetchConsentManagerId } from './fetchConsentManagerId';

/**
 * Sync the consent manager
 *
 * @param client - GraphQL client
 * @param consentManager - The consent manager input
 */
export async function syncConsentManager(
  client: GraphQLClient,
  consentManager: ConsentManagerInput,
): Promise<void> {
  const airgapBundleId = await fetchConsentManagerId(client);
  if (consentManager.domains) {
    await makeGraphQLRequest(client, UPDATE_CONSENT_MANAGER_DOMAINS, {
      domains: consentManager.domains,
      airgapBundleId,
    });
  }
}
