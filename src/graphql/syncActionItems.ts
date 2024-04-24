import { ActionItemInput } from '../codecs';
import uniq from 'lodash/uniq';
import chunk from 'lodash/chunk';
import { GraphQLClient } from 'graphql-request';
import { mapSeries } from 'bluebird';
import { UPDATE_ACTION_ITEMS, CREATE_ACTION_ITEMS } from './gqls';
import { logger } from '../logger';
import keyBy from 'lodash/keyBy';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import colors from 'colors';
import { fetchAllActionItems, ActionItem } from './fetchAllActionItems';
import {
  ActionItemCollection,
  fetchAllActionItemCollections,
} from './fetchAllActionItemCollections';

/**
 * Input to create a new actionItem
 *
 * @param client - GraphQL client
 * @param actionItems - Action item inputs
 * @param actionItemCollectionByTitle - Action item collections indexed by title
 */
export async function createActionItems(
  client: GraphQLClient,
  actionItems: ActionItemInput[],
  actionItemCollectionByTitle: { [k in string]: ActionItemCollection },
): Promise<void> {
  const chunked = chunk(actionItems, 100);
  await mapSeries(chunked, async (chunkToUpload) => {
    await makeGraphQLRequest(client, CREATE_ACTION_ITEMS, {
      input: chunkToUpload.map((actionItem) => ({
        title: actionItem.title,
        type: actionItem.type,
        priorityOverride: actionItem.priority,
        dueDate: actionItem.dueDate,
        resolved: actionItem.resolved,
        notes: actionItem.notes,
        link: actionItem.link,
        assigneesUserEmails: actionItem.users,
        assigneesTeamNames: actionItem.teams,
        // TODO: https://transcend.height.app/T-21660
        // attributes: actionItem.attributes,
        collectionIds: actionItem.collections.map(
          (collectionTitle) => actionItemCollectionByTitle[collectionTitle].id,
        ),
      })),
    });
  });
}

/**
 * Input to update actionItems
 *
 * @param client - GraphQL client
 * @param input - Input to update
 * @param actionItemId - ID of action item to update
 */
export async function updateActionItem(
  client: GraphQLClient,
  input: ActionItemInput,
  actionItemId: string,
): Promise<void> {
  await makeGraphQLRequest(client, UPDATE_ACTION_ITEMS, {
    input: {
      ids: [actionItemId],
      ...input,
      title: input.title,
      priorityOverride: input.priority,
      dueDate: input.dueDate,
      resolved: input.resolved,
      notes: input.notes,
      link: input.link,
      assigneesUserEmails: input.users,
      assigneesTeamNames: input.teams,
      // TODO: https://transcend.height.app/T-21660
      // attributes: input.attributes,
    },
  });
}

/**
 * Sync the action item
 *
 * @param client - GraphQL client
 * @param inputs - Inputs to create
 * @returns True if run without error, returns false if an error occurred
 */
export async function syncActionItems(
  client: GraphQLClient,
  inputs: ActionItemInput[],
): Promise<boolean> {
  let encounteredError = false;
  // Fetch existing
  logger.info(colors.magenta(`Syncing "${inputs.length}" actionItems...`));

  // Fetch existing
  const [existingActionItems, existingActionItemCollections] =
    await Promise.all([
      fetchAllActionItems(client),
      fetchAllActionItemCollections(client),
    ]);

  // Look up by title
  const actionItemCollectionByTitle: { [k in string]: ActionItemCollection } =
    keyBy(existingActionItemCollections, 'title');
  const actionItemByTitle: { [k in string]: ActionItem } = keyBy(
    existingActionItems,
    ({ title, collections }) =>
      `${title}-${collections
        .map((c) => c.title)
        .sort()
        .join('-')}`,
  );

  // Ensure all collections exist
  const missingCollections = uniq(
    inputs.map((input) => input.collections).flat(),
  ).filter((collectionTitle) => !actionItemCollectionByTitle[collectionTitle]);
  if (missingCollections.length > 0) {
    logger.info(
      colors.red(
        `Missing action item collections: "${missingCollections.join(
          '", "',
        )}" - please create them first!`,
      ),
    );
    return false;
  }

  // Create new actionItems
  const newActionItems = inputs.filter(
    (input) =>
      !actionItemByTitle[
        `${input.title}-${input.collections.sort().join('-')}`
      ],
  );

  // Create new actionItems
  if (newActionItems.length > 0) {
    try {
      logger.info(
        colors.magenta(`Creating "${newActionItems.length}" actionItems...`),
      );
      await createActionItems(
        client,
        newActionItems,
        actionItemCollectionByTitle,
      );
      logger.info(
        colors.green(
          `Successfully created "${newActionItems.length}" actionItems!`,
        ),
      );
    } catch (err) {
      encounteredError = true;
      logger.info(
        colors.red(`Failed to create action items! - ${err.message}`),
      );
    }
  }

  // Update all actionItems
  const actionItemsToUpdate = inputs
    .map((input) => [
      input,
      actionItemByTitle[`${input.title}-${input.collections.sort().join('-')}`]
        ?.id,
    ])
    .filter((x): x is [ActionItemInput, string] => !!x[1]);
  await mapSeries(actionItemsToUpdate, async ([input, actionItemId]) => {
    try {
      await updateActionItem(client, input, actionItemId);
      logger.info(
        colors.green(`Successfully synced action item "${input.title}"!`),
      );
    } catch (err) {
      encounteredError = true;
      logger.info(
        colors.red(
          `Failed to sync action item "${input.title}"! - ${err.message}`,
        ),
      );
    }
  });

  return !encounteredError;
}
