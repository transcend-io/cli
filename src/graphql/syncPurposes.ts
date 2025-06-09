import { PreferenceTopicInput, PurposeInput } from '../codecs';
import colors from 'colors';
import { GraphQLClient } from 'graphql-request';
import {
  UPDATE_PURPOSE,
  CREATE_PURPOSE,
  CREATE_OR_UPDATE_PREFERENCE_TOPIC,
} from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import { map } from 'bluebird';
import {
  PurposeWithPreferences,
  fetchAllPurposesAndPreferences,
} from './fetchAllPurposesAndPreferences';
import keyBy from 'lodash/keyBy';
import { logger } from '../logger';
import { KnownDefaultPurpose } from '@transcend-io/airgap.js-types';
import { fetchAllPreferenceOptionValues } from './fetchAllPreferenceOptionValues';
import { PreferenceOptionValue } from './syncPreferenceOptionValues';
import { PreferenceTopic } from './fetchAllPreferenceTopics';

export interface PreferenceTopicInputOptions {
  /** Purpose ID */
  purposeId: string;
  /** Preference topics to create or update */
  optionValuesBySlug: Record<string, PreferenceOptionValue>;
  /** Preference topics by slug */
  topicsBySlug: Record<string, PreferenceTopic>;
  /** Concurrency for upload */
  concurrency: number;
}

/**
 * Create or update preference topics for a purpose.
 *
 * @param client - GraphQL client
 * @param topics - Preference topics to create or update
 * @param options - Options
 */
export async function createOrUpdatePreferenceTopics(
  client: GraphQLClient,
  topics: PreferenceTopicInput[],
  {
    purposeId,
    optionValuesBySlug,
    topicsBySlug,
    concurrency = 20,
  }: PreferenceTopicInputOptions,
): Promise<void> {
  await map(
    topics,
    async (topic) => {
      const existingTopic = topicsBySlug[topic.slug];
      await makeGraphQLRequest(client, CREATE_OR_UPDATE_PREFERENCE_TOPIC, {
        input: {
          input: {
            type: topic.type,
            title: topic.title,
            slug: topic.slug,
            showInPrivacyCenter: topic['show-in-privacy-center'],
            purposeId,
            ...(topic.options
              ? {
                  preferenceOptionValueIds: topic.options.map((option) => {
                    const result = optionValuesBySlug[option];
                    if (!result) {
                      throw new Error(
                        `Preference option value with slug "${option}" not found.`,
                      );
                    }
                    return result.id;
                  }),
                }
              : {}),
            ...(existingTopic
              ? {
                  id: existingTopic.id,
                }
              : {}),
            displayDescription: topic.description,
            defaultConfiguration: topic['default-configuration'],
          },
        },
      });
    },
    { concurrency },
  );
}

/**
 * Create a new purpose
 *
 * @param client - GraphQL client
 * @param input - Purpose input
 * @param options - Options for syncing preference topics
 * @returns Purpose ID
 */
export async function createPurpose(
  client: GraphQLClient,
  input: PurposeInput,
  options: Omit<PreferenceTopicInputOptions, 'purposeId' | 'topicsBySlug'>,
): Promise<string> {
  const {
    createPurpose: { purpose },
  } = await makeGraphQLRequest<{
    /** createPurpose mutation */
    createPurpose: {
      /** Purpose */
      purpose: {
        /** ID */
        id: string;
      };
    };
  }>(client, CREATE_PURPOSE, {
    // TODO: https://transcend.height.app/T-31994 - include models and groups, teams, users
    input: {
      trackingType: input['tracking-type'],
      showInPrivacyCenter: input['show-in-privacy-center'],
      showInConsentManager: input['show-in-consent-manager'],
      optOutSignals: input['opt-out-signals'],
      name: input.title,
      isActive: input['is-active'],
      description: input.description,
      displayOrder: input['display-order'],
      configurable: input.configurable,
      authLevel: input['auth-level'],
    },
  });
  logger.info(colors.green(`Successfully created purpose "${input.title}"!`));

  // then upsert preference topics
  if (input['preference-topics'] && input['preference-topics'].length > 0) {
    await createOrUpdatePreferenceTopics(client, input['preference-topics'], {
      ...options,
      purposeId: purpose.id,
      topicsBySlug: {}, // none exist at this point
    });
    logger.info(
      colors.green(
        `Successfully updated ${
          input['preference-topics'].length
        } preferences for purpose: ${purpose.id}:${
          input.title || input['tracking-type']
        }!`,
      ),
    );
  }
  return purpose.id;
}

/**
 * Update a purpose
 *
 * @param client - GraphQL client
 * @param input - Purpose input
 * @param options - Options for syncing preference topics
 */
export async function updatePurpose(
  client: GraphQLClient,
  input: PurposeInput,
  options: PreferenceTopicInputOptions,
): Promise<void> {
  // First update the purpose
  await makeGraphQLRequest(client, UPDATE_PURPOSE, {
    input: {
      id: options.purposeId,
      title: input.title,
      showInPrivacyCenter: input['show-in-privacy-center'],
      ...(!Object.values(KnownDefaultPurpose).includes(
        input['tracking-type'] as KnownDefaultPurpose,
      )
        ? {
            showInConsentManager: input['show-in-consent-manager'],
            configurable: input.configurable,
          }
        : {}),
      optOutSignals: input['opt-out-signals'],
      name: input.title,
      isActive: input['is-active'],
      displayOrder: input['display-order'],
      description: input.description,
      authLevel: input['auth-level'],
    },
  });
  logger.info(
    colors.green(
      `Successfully updated purpose: ${options.purposeId}:${
        input.title || input['tracking-type']
      }!`,
    ),
  );

  // then upsert preference topics
  if (input['preference-topics'] && input['preference-topics'].length > 0) {
    await createOrUpdatePreferenceTopics(
      client,
      input['preference-topics'],
      options,
    );
    logger.info(
      colors.green(
        `Successfully updated ${
          input['preference-topics'].length
        } preferences for purpose: ${options.purposeId}:${
          input.title || input['tracking-type']
        }!`,
      ),
    );
  }
}

/**
 * Sync the purposes
 *
 * @param client - GraphQL client
 * @param purposes - Purposes
 * @param concurrency - Concurrency
 * @returns True if synced successfully
 */
export async function syncPurposes(
  client: GraphQLClient,
  purposes: PurposeInput[],
  concurrency = 20,
): Promise<boolean> {
  let encounteredError = false;
  logger.info(colors.magenta(`Syncing "${purposes.length}" purposes...`));

  // Index existing purposes
  const [existing, existingOptions] = await Promise.all([
    fetchAllPurposesAndPreferences(client),
    fetchAllPreferenceOptionValues(client),
  ]);
  const purposeByTrackingType = keyBy(existing, 'trackingType');
  const optionValuesBySlug = keyBy(existingOptions, 'slug');

  // Determine which purposes are new vs existing
  const mapPurposesToExisting = purposes.map((purposeInput) => [
    purposeInput,
    purposeByTrackingType[purposeInput['tracking-type']],
  ]);

  // Create the new purposes
  const newPurposes = mapPurposesToExisting
    .filter(([, existing]) => !existing)
    .map(([purposeInput]) => purposeInput as PurposeInput);
  try {
    logger.info(
      colors.magenta(`Creating "${newPurposes.length}" new purposes...`),
    );
    await map(
      newPurposes,
      async (purpose) => {
        await createPurpose(client, purpose, {
          concurrency,
          optionValuesBySlug,
        });
      },
      {
        concurrency,
      },
    );
    logger.info(
      colors.green(`Successfully synced ${newPurposes.length} purposes!`),
    );
  } catch (err) {
    encounteredError = true;
    logger.info(colors.red(`Failed to create purposes! - ${err.message}`));
  }

  // Update existing purposes
  const existingPurposes = mapPurposesToExisting.filter(
    (x): x is [PurposeInput, PurposeWithPreferences] => !!x[1],
  );
  try {
    logger.info(
      colors.magenta(`Updating "${existingPurposes.length}" purposes...`),
    );
    await map(
      existingPurposes,
      async ([purposeInput, existingPurpose]) => {
        try {
          await updatePurpose(client, purposeInput, {
            concurrency,
            optionValuesBySlug,
            purposeId: existingPurpose.id,
            topicsBySlug: keyBy(existingPurpose.topics, 'slug'),
          });
          logger.info(
            colors.green(
              `Successfully updated purpose with ID "${existingPurpose.id}", slug: ${purposeInput['tracking-type']}!`,
            ),
          );
        } catch (err) {
          encounteredError = true;
          logger.info(
            colors.red(
              `Failed to update purpose with ID "${existingPurpose.id}", ` +
                `slug: ${purposeInput['tracking-type']} ! - ${err.message}`,
            ),
          );
        }
      },
      {
        concurrency,
      },
    );
    logger.info(
      colors.green(
        `Successfully updated "${existingPurposes.length}" purposes!`,
      ),
    );
  } catch (err) {
    encounteredError = true;
    logger.info(colors.red(`Failed to update purposes! - ${err.message}`));
  }

  logger.info(colors.green(`Synced "${purposes.length}" purposes!`));

  // Return true upon success
  return !encounteredError;
}
