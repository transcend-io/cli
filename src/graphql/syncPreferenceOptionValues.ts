import { PreferenceTopicOptionValueInput } from '../codecs';
import colors from 'colors';
import { GraphQLClient } from 'graphql-request';
import { CREATE_OR_UPDATE_PREFERENCE_OPTION_VALUES } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import { logger } from '../logger';
import { fetchAllPreferenceOptionValues } from './fetchAllPreferenceOptionValues';
import keyBy from 'lodash/keyBy';

/**
 * Response type for fetching all purposes and preferences.
 */
export type PreferenceOptionValue = {
  /** ID */
  id: string;
  /** Slug */
  slug: string;
};

/**
 * Create or update preference option values for a topic.
 *
 * @param client - GraphQL client
 * @param optionValues - Preference option values to create or update, alongside their IDs if they exist
 */
export async function createOrUpdatePreferenceOptionValues(
  client: GraphQLClient,
  optionValues: [PreferenceTopicOptionValueInput, string | undefined][],
): Promise<PreferenceOptionValue[]> {
  const result = await makeGraphQLRequest<{
    /** createOrUpdatePreferenceOptionValues mutation */
    createOrUpdatePreferenceOptionValues: {
      /** Preference option values */
      preferenceOptionValues: PreferenceOptionValue[];
    };
  }>(client, CREATE_OR_UPDATE_PREFERENCE_OPTION_VALUES, {
    input: {
      input: {
        preferenceOptionValues: optionValues.map(([optionValue, id]) => ({
          ...optionValue,
          id,
        })),
      },
    },
  });
  return result.createOrUpdatePreferenceOptionValues.preferenceOptionValues;
}

/**
 * Sync the preference option values
 *
 * @param client - GraphQL client
 * @param optionValues - Preference option values
 * @returns True if synced successfully
 */
export async function syncPreferenceOptionValues(
  client: GraphQLClient,
  optionValues: PreferenceTopicOptionValueInput[],
): Promise<boolean> {
  let encounteredError = false;
  logger.info(
    colors.magenta(
      `Syncing "${optionValues.length}" preference option values...`,
    ),
  );

  // Index existing preference option values
  const existing = await fetchAllPreferenceOptionValues(client);
  const optionValueBySlug = keyBy(existing, 'slug');

  try {
    logger.info(
      colors.magenta(
        `Performing bulk create or update for "${optionValues.length}" preference option values...`,
      ),
    );

    await createOrUpdatePreferenceOptionValues(
      client,
      optionValues.map((optionValueInput) => [
        optionValueInput,
        optionValueBySlug[optionValueInput.slug]?.id,
      ]),
    );

    logger.info(
      colors.green(
        `Successfully synced "${optionValues.length}" preference option values!`,
      ),
    );
  } catch (err) {
    encounteredError = true;
    logger.info(
      colors.red(`Failed to sync preference option values! - ${err.message}`),
    );
  }

  // Return true upon success
  return !encounteredError;
}
