import { ConsentManagerInput } from '../codecs';
import { GraphQLClient } from 'graphql-request';
import {
  UPDATE_CONSENT_MANAGER_DOMAINS,
  FETCH_PRIVACY_CENTER_ID,
  CREATE_CONSENT_MANAGER,
  UPDATE_TOGGLE_USP_API,
  UPDATE_CONSENT_MANAGER_PARTITION,
  TOGGLE_TELEMETRY_PARTITION_STRATEGY,
  TOGGLE_UNKNOWN_COOKIE_POLICY,
  TOGGLE_UNKNOWN_REQUEST_POLICY,
  DEPLOYED_PRIVACY_CENTER_URL,
} from './gqls';
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
  let airgapBundleId: string;

  // ensure the consent manager is created and deployed
  try {
    airgapBundleId = await fetchConsentManagerId(client, 1);
  } catch (err) {
    // TODO: https://transcend.height.app/T-23778
    if (err.message.includes('AirgapBundle not found')) {
      const { organization } = await makeGraphQLRequest<{
        /** Organization */
        organization: {
          /** URL */
          deployedPrivacyCenterUrl: string;
        };
      }>(client, DEPLOYED_PRIVACY_CENTER_URL);

      const { privacyCenter } = await makeGraphQLRequest<{
        /** Privacy center */
        privacyCenter: {
          /** ID */
          id: string;
        };
      }>(client, FETCH_PRIVACY_CENTER_ID, {
        url: organization.deployedPrivacyCenterUrl,
      });

      const { createConsentManager } = await makeGraphQLRequest<{
        /** Create consent manager */
        createConsentManager: {
          /** Consent manager */
          consentManager: {
            /** ID */
            id: string;
          };
        };
      }>(client, CREATE_CONSENT_MANAGER, {
        domains: consentManager.domains,
        privacyCenterId: privacyCenter.id,
      });
      airgapBundleId = createConsentManager.consentManager.id;
    } else {
      throw err;
    }
  }

  // sync domains
  if (consentManager.domains) {
    await makeGraphQLRequest(client, UPDATE_CONSENT_MANAGER_DOMAINS, {
      domains: consentManager.domains,
      airgapBundleId,
    });
  }

  // sync partition
  if (consentManager.partition) {
    await makeGraphQLRequest(client, UPDATE_CONSENT_MANAGER_PARTITION, {
      partition: consentManager.partition,
      airgapBundleId,
    });
  }

  // sync uspapi
  if (consentManager.uspapi || consentManager.signedIabAgreement) {
    await makeGraphQLRequest(client, UPDATE_TOGGLE_USP_API, {
      input: {
        id: airgapBundleId,
        ...(consentManager.uspapi ? { uspapi: consentManager.uspapi } : {}),
        ...(consentManager.signedIabAgreement
          ? { signedIabAgreement: consentManager.signedIabAgreement }
          : {}),
      },
    });
  }

  // sync default request policy
  if (consentManager.unknownRequestPolicy) {
    await makeGraphQLRequest(client, TOGGLE_UNKNOWN_REQUEST_POLICY, {
      input: {
        id: airgapBundleId,
        unknownRequestPolicy: consentManager.unknownRequestPolicy,
      },
    });
  }

  // sync default cookie policy
  if (consentManager.unknownRequestPolicy) {
    await makeGraphQLRequest(client, TOGGLE_UNKNOWN_COOKIE_POLICY, {
      input: {
        id: airgapBundleId,
        unknownCookiePolicy: consentManager.unknownCookiePolicy,
      },
    });
  }

  // sync telemetry partition strategy
  if (consentManager.telemetryPartitioning) {
    await makeGraphQLRequest(client, TOGGLE_TELEMETRY_PARTITION_STRATEGY, {
      input: {
        id: airgapBundleId,
        strategy: consentManager.telemetryPartitioning,
      },
    });
  }

  // TODO: https://transcend.height.app/T-23875
  //  syncEndpoint: string;
  // TODO: https://transcend.height.app/T-23919
  //  syncGroups: string;
}
