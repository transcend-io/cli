import { ConsentPreferenceTopic, ConsentPurpose } from '../../codecs';
import colors from 'colors';
import { GraphQLClient } from 'graphql-request';
import {
  UPDATE_PURPOSE,
  CREATE_PURPOSE,
  CREATE_OR_UPDATE_PREFERENCE_TOPIC,
} from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import { map } from '../bluebird';
import {
  PurposeWithPreferences,
  fetchAllPurposesAndPreferences,
} from './fetchAllPurposesAndPreferences';
import { keyBy } from 'lodash-es';
import { logger } from '../../logger';
import {
  fetchAllPreferenceOptionValues,
  type PreferenceOptionValue,
} from './fetchAllPreferenceOptionValues';
import { PreferenceTopic } from './fetchAllPreferenceTopics';

export interface PreferenceTopicSyncOptions {
  /** Purpose ID */
  purposeId: string;
  /** Preference option values indexed by slug */
  optionValuesBySlug: Record<string, PreferenceOptionValue>;
  /** Existing preference topics indexed by slug */
  topicsBySlug: Record<string, PreferenceTopic>;
  /** Concurrency for upload */
  concurrency: number;
}

/**
 * Create or update preference topics for a purpose
 *
 * @param client - GraphQL client
 * @param topics - Preference topics to create or update
 * @param options - Options
 */
export async function createOrUpdatePreferenceTopics(
  client: GraphQLClient,
  topics: ConsentPreferenceTopic[],
  {
    purposeId,
    optionValuesBySlug,
    topicsBySlug,
    concurrency = 20,
  }: PreferenceTopicSyncOptions,
): Promise<void> {
  await map(
    topics,
    async (topic) => {
      const existingTopic = topicsBySlug[topic.title];
      await makeGraphQLRequest(client, CREATE_OR_UPDATE_PREFERENCE_TOPIC, {
        input: {
          type: topic.type,
          title: topic.title,
          showInPrivacyCenter: topic['show-in-privacy-center'],
          purposeId,
          ...(topic.options
            ? {
                preferenceOptionValueIds: topic.options.map((option) => {
                  const result = optionValuesBySlug[option.slug];
                  if (!result) {
                    throw new Error(
                      `Preference option value with slug "${option.slug}" not found.`,
                    );
                  }
                  return result.id;
                }),
              }
            : {}),
          ...(existingTopic ? { id: existingTopic.id } : {}),
          displayDescription: topic.description,
          defaultConfiguration: topic['default-configuration'],
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
  input: ConsentPurpose,
  options: Omit<PreferenceTopicSyncOptions, 'purposeId' | 'topicsBySlug'>,
): Promise<string> {
  const {
    createPurpose: { trackingPurpose },
  } = await makeGraphQLRequest<{
    /** createPurpose mutation */
    createPurpose: {
      /** Purpose */
      trackingPurpose: {
        /** ID */
        id: string;
      };
    };
  }>(client, CREATE_PURPOSE, {
    input: {
      trackingType: input.trackingType,
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

  if (input['preference-topics'] && input['preference-topics'].length > 0) {
    await createOrUpdatePreferenceTopics(client, input['preference-topics'], {
      ...options,
      purposeId: trackingPurpose.id,
      topicsBySlug: {},
    });
    logger.info(
      colors.green(
        `Successfully synced ${input['preference-topics'].length} preference topics for purpose "${input.title}"!`,
      ),
    );
  }
  return trackingPurpose.id;
}

/**
 * Update an existing purpose
 *
 * @param client - GraphQL client
 * @param input - Purpose input
 * @param options - Options for syncing preference topics
 */
export async function updatePurpose(
  client: GraphQLClient,
  input: ConsentPurpose,
  options: PreferenceTopicSyncOptions,
): Promise<void> {
  await makeGraphQLRequest(client, UPDATE_PURPOSE, {
    input: {
      id: options.purposeId,
      title: input.title,
      showInPrivacyCenter: input['show-in-privacy-center'],
      showInConsentManager: input['show-in-consent-manager'],
      configurable: input.configurable,
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
        input.title || input.trackingType
      }!`,
    ),
  );

  if (input['preference-topics'] && input['preference-topics'].length > 0) {
    await createOrUpdatePreferenceTopics(
      client,
      input['preference-topics'],
      options,
    );
    logger.info(
      colors.green(
        `Successfully synced ${
          input['preference-topics'].length
        } preference topics for purpose "${
          input.title || input.trackingType
        }"!`,
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
  purposes: ConsentPurpose[],
  concurrency = 20,
): Promise<boolean> {
  let encounteredError = false;
  logger.info(colors.magenta(`Syncing "${purposes.length}" purposes...`));

  const [existing, existingOptions] = await Promise.all([
    fetchAllPurposesAndPreferences(client),
    fetchAllPreferenceOptionValues(client),
  ]);
  const purposeByTrackingType = keyBy(existing, 'trackingType');
  const optionValuesBySlug = keyBy(existingOptions, 'slug');

  const mapPurposesToExisting = purposes.map((purposeInput) => [
    purposeInput,
    purposeByTrackingType[purposeInput.trackingType],
  ]);

  // Create new purposes
  const newPurposes = mapPurposesToExisting
    .filter(([, existing]) => !existing)
    .map(([purposeInput]) => purposeInput as ConsentPurpose);
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
      { concurrency },
    );
    logger.info(
      colors.green(`Successfully created ${newPurposes.length} purposes!`),
    );
  } catch (err) {
    encounteredError = true;
    logger.info(colors.red(`Failed to create purposes! - ${err.message}`));
  }

  // Update existing purposes
  const existingPurposes = mapPurposesToExisting.filter(
    (x): x is [ConsentPurpose, PurposeWithPreferences] => !!x[1],
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
        } catch (err) {
          encounteredError = true;
          logger.info(
            colors.red(
              `Failed to update purpose "${existingPurpose.id}" (${purposeInput.trackingType})! - ${err.message}`,
            ),
          );
        }
      },
      { concurrency },
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

  return !encounteredError;
}
