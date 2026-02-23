import { ProcessingActivityInput } from '../../codecs';
import { GraphQLClient } from 'graphql-request';
import Bluebird from 'bluebird';
import {
  UPDATE_PROCESSING_ACTIVITIES,
  CREATE_PROCESSING_ACTIVITY,
} from './gqls';
import { logger } from '../../logger';
import { keyBy } from 'lodash-es';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import colors from 'colors';
import {
  fetchAllProcessingActivities,
  ProcessingActivity,
} from './fetchAllProcessingActivities';

const { mapSeries } = Bluebird;

/**
 * Create a new processing activity, setting only title and description
 *
 * @param client - GraphQL client
 * @param processingActivity - Input
 * @returns Created processingActivity
 */
async function createProcessingActivity(
  client: GraphQLClient,
  processingActivity: ProcessingActivityInput,
): Promise<Pick<ProcessingActivity, 'id' | 'title'>> {
  const input = {
    title: processingActivity.title,
    description: processingActivity.description,
  };

  const { createProcessingActivity } = await makeGraphQLRequest<{
    /** Create processingActivity mutation */
    createProcessingActivity: {
      /** Created processingActivity */
      processingActivity: ProcessingActivity;
    };
  }>(client, CREATE_PROCESSING_ACTIVITY, {
    input,
  });
  return createProcessingActivity.processingActivity;
}

/**
 * Update a list of processing activities.
 *
 * @param client - GraphQL client
 * @param processingActivityIdPairs - [ProcessingActivityInput, processingActivityId] list
 */
async function updateProcessingActivities(
  client: GraphQLClient,
  processingActivityIdPairs: [ProcessingActivityInput, string][],
): Promise<void> {
  const invalidProcessingActivityTitles = processingActivityIdPairs
    .filter(([, id]) => id === undefined)
    .map(([{ title }]) => title);
  if (invalidProcessingActivityTitles.length > 0) {
    // We always attempt to create processing activities before updating them, but if creation failed
    // (for example, due to insufficient scope), this provides a better error message
    throw new Error(
      `The following ${
        invalidProcessingActivityTitles.length
      } processing activities do not exist and thus can't be updated: "${invalidProcessingActivityTitles.join(
        '", "',
      )}"`,
    );
  }
  await makeGraphQLRequest(client, UPDATE_PROCESSING_ACTIVITIES, {
    input: {
      processingActivities: processingActivityIdPairs.map(
        ([
          {
            processingSubPurposes,
            dataSubCategories,
            saaSCategories,
            ...processingActivity
          },
          id,
        ]) => ({
          dataSubCategoryInputs: dataSubCategories?.map(
            ({ category, name }) => ({ category, name: name ?? '' }),
          ),
          processingPurposeSubCategoryInputs: processingSubPurposes?.map(
            ({ purpose, name }) => ({ purpose, name: name ?? 'Other' }),
          ),
          saaSCategoryTitles: saaSCategories,
          ...processingActivity,
          id,
        }),
      ),
    },
  });
}

/**
 * Sync the data inventory processing activities
 *
 * @param client - GraphQL client
 * @param inputs - Inputs to create
 * @returns True if run without error, returns false if an error occurred
 */
export async function syncProcessingActivities(
  client: GraphQLClient,
  inputs: ProcessingActivityInput[],
): Promise<boolean> {
  let encounteredError = false;

  // Fetch existing
  logger.info(
    colors.magenta(`Syncing "${inputs.length}" processing activities...`),
  );
  const existingProcessingActivities = await fetchAllProcessingActivities(
    client,
  );

  // Look up by title
  const processingActivityByTitle: Record<
    string,
    Pick<ProcessingActivity, 'id' | 'title'>
  > = keyBy(existingProcessingActivities, 'title');

  // Create new processingActivities
  const newProcessingActivities = inputs.filter(
    (input) => !processingActivityByTitle[input.title],
  );
  if (newProcessingActivities.length > 0) {
    logger.info(
      colors.magenta(
        `Creating "${newProcessingActivities.length}" new processing activities...`,
      ),
    );
  }
  await mapSeries(newProcessingActivities, async (processingActivity) => {
    try {
      const newProcessingActivity = await createProcessingActivity(
        client,
        processingActivity,
      );
      // Augment processingActivityByTitle with newly-created processing activity
      processingActivityByTitle[newProcessingActivity.title] =
        newProcessingActivity;
      logger.info(
        colors.green(
          `Successfully created processing activity "${processingActivity.title}"!`,
        ),
      );
    } catch (err) {
      encounteredError = true;
      logger.info(
        colors.red(
          `Failed to create processing activity "${processingActivity.title}"! - ${err.message}`,
        ),
      );
    }
  });

  // Update all processing activities
  try {
    logger.info(
      colors.magenta(`Updating "${inputs.length}" processing activities!`),
    );
    await updateProcessingActivities(
      client,
      inputs.map((input) => [
        input,
        // This processing activity might not exist if the `create` step failed
        processingActivityByTitle[input.title]?.id,
      ]),
    );
    logger.info(
      colors.green(
        `Successfully synced "${inputs.length}" processingActivities!`,
      ),
    );
  } catch (err) {
    encounteredError = true;
    logger.info(
      colors.red(
        `Failed to sync "${inputs.length}" processingActivities! - ${err.message}`,
      ),
    );
  }

  return !encounteredError;
}
