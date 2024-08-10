import { ConsentManageExperienceInput, ConsentManagerInput } from '../codecs';
import colors from 'colors';
import { GraphQLClient } from 'graphql-request';
import {
  UPDATE_CONSENT_MANAGER_DOMAINS,
  CREATE_CONSENT_MANAGER,
  UPDATE_TOGGLE_USP_API,
  UPDATE_CONSENT_MANAGER_PARTITION,
  UPDATE_CONSENT_MANAGER_VERSION,
  TOGGLE_TELEMETRY_PARTITION_STRATEGY,
  TOGGLE_UNKNOWN_COOKIE_POLICY,
  TOGGLE_CONSENT_PRECEDENCE,
  TOGGLE_UNKNOWN_REQUEST_POLICY,
  DEPLOYED_PRIVACY_CENTER_URL,
  UPDATE_CONSENT_EXPERIENCE,
  CREATE_CONSENT_PARTITION,
  CREATE_CONSENT_EXPERIENCE,
  UPDATE_CONSENT_MANAGER_THEME,
} from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import {
  fetchConsentManagerId,
  fetchConsentManagerExperiences,
  fetchPurposes,
  fetchConsentManagerPartitions,
} from './fetchConsentManagerId';
import keyBy from 'lodash/keyBy';
import { map, mapSeries } from 'bluebird';
import {
  InitialViewState,
  OnConsentExpiry,
} from '@transcend-io/airgap.js-types';
import difference from 'lodash/difference';
import { logger } from '../logger';
import { fetchPrivacyCenterId } from './fetchPrivacyCenterId';

const PURPOSES_LINK =
  'https://app.transcend.io/consent-manager/regional-experiences/purposes';

/**
 * Sync consent manager experiences up to Transcend
 *
 * @param client - GraphQL client
 * @param experiences - The experience inputs
 */
export async function syncConsentManagerExperiences(
  client: GraphQLClient,
  experiences: ConsentManageExperienceInput[],
): Promise<void> {
  // Fetch existing experiences and
  const existingExperiences = await fetchConsentManagerExperiences(client);
  const experienceLookup = keyBy(existingExperiences, 'name');

  // Fetch existing purposes
  const purposes = await fetchPurposes(client);
  const purposeLookup = keyBy(purposes, 'name');

  // Bulk update or create experiences
  await map(
    experiences,
    async (exp, ind) => {
      // Purpose IDs
      const purposeIds = exp.purposes?.map((purpose, ind2) => {
        const existingPurpose = purposeLookup[purpose.name];
        if (!existingPurpose) {
          throw new Error(
            `Invalid purpose name provided at consentManager.experiences[${ind}].purposes[${ind2}]: ` +
              `${purpose.name}. See list of valid purposes ${PURPOSES_LINK}`,
          );
        }
        return existingPurpose.id;
      });
      const optedOutPurposeIds = exp.optedOutPurposes?.map((purpose, ind2) => {
        const existingPurpose = purposeLookup[purpose.name];
        if (!existingPurpose) {
          throw new Error(
            `Invalid purpose name provided at consentManager.experiences[${ind}].optedOutPurposes[${ind2}]: ` +
              `${purpose.name}. See list of valid purposes ${PURPOSES_LINK}`,
          );
        }
        return existingPurpose.id;
      });

      // update experience
      const existingExperience = experienceLookup[exp.name];
      if (existingExperience) {
        await makeGraphQLRequest(client, UPDATE_CONSENT_EXPERIENCE, {
          input: {
            id: existingExperience.id,
            name: exp.displayName,
            regions: exp.regions,
            operator: exp.operator,
            onConsentExpiry: exp.onConsentExpiry,
            consentExpiry: exp.consentExpiry,
            displayPriority:
              exp.displayPriority !== existingExperience.displayPriority
                ? exp.displayPriority
                : undefined,
            viewState: exp.viewState,
            purposes: purposeIds,
            optedOutPurposes: optedOutPurposeIds,
            browserLanguages: exp.browserLanguages,
            browserTimeZones: exp.browserTimeZones,
          },
        });
        logger.info(
          colors.green(`Successfully synced consent experience "${exp.name}"!`),
        );
      } else {
        // create new experience
        await makeGraphQLRequest(client, CREATE_CONSENT_EXPERIENCE, {
          input: {
            name: exp.name,
            displayName: exp.displayName,
            regions: exp.regions,
            operator: exp.operator,
            onConsentExpiry: exp.onConsentExpiry || OnConsentExpiry.Prompt,
            consentExpiry: exp.consentExpiry,
            displayPriority: exp.displayPriority,
            viewState: exp.viewState || InitialViewState.Hidden,
            purposes: purposeIds || [],
            optedOutPurposes: optedOutPurposeIds || [],
            browserLanguages: exp.browserLanguages,
            browserTimeZones: exp.browserTimeZones,
          },
        });
        logger.info(
          colors.green(
            `Successfully created consent experience "${exp.name}"!`,
          ),
        );
      }
    },
    {
      concurrency: 10,
    },
  );
}

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

      const privacyCenterId = await fetchPrivacyCenterId(
        client,
        organization.deployedPrivacyCenterUrl,
      );

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
        privacyCenterId: privacyCenterId,
      });
      airgapBundleId = createConsentManager.consentManager.id;
    } else {
      throw err;
    }
  }

  if (consentManager.partitions) {
    const partitions = await fetchConsentManagerPartitions(client);
    const newPartitionNames = difference(
      consentManager.partitions.map(({ name }) => name),
      partitions.map(({ name }) => name),
    );
    await mapSeries(newPartitionNames, async (name) => {
      await makeGraphQLRequest(client, CREATE_CONSENT_PARTITION, {
        input: {
          name,
        },
      });
      logger.info(
        colors.green(`Successfully created consent partition: ${name}!`),
      );
    });
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

  if (consentManager.version) {
    await makeGraphQLRequest(client, UPDATE_CONSENT_MANAGER_VERSION, {
      airgapBundleId,
      version: consentManager.version,
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

  // sync telemetry partition strategy
  if (consentManager.consentPrecedence) {
    await makeGraphQLRequest(client, TOGGLE_CONSENT_PRECEDENCE, {
      input: {
        id: airgapBundleId,
        consentPrecedence: consentManager.consentPrecedence,
      },
    });
  }

  // Update experience configurations
  if (consentManager.experiences) {
    await syncConsentManagerExperiences(client, consentManager.experiences);
  }

  // update theme
  if (consentManager.theme) {
    await makeGraphQLRequest(client, UPDATE_CONSENT_MANAGER_THEME, {
      input: {
        airgapBundleId,
        ...consentManager.theme,
      },
    });
  }

  // TODO: https://transcend.height.app/T-23875
  //  syncEndpoint: string;
  // TODO: https://transcend.height.app/T-23919
  //  syncGroups: string;
}
