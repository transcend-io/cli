import { ActionItemInput } from '../../codecs';
import uniq from 'lodash/uniq';
import chunk from 'lodash/chunk';
import { GraphQLClient } from 'graphql-request';
import { mapSeries } from 'bluebird';
import { UPDATE_ACTION_ITEMS, CREATE_ACTION_ITEMS } from './gqls';
import { logger } from '../../logger';
import keyBy from 'lodash/keyBy';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import colors from 'colors';
import { fetchAllActionItems, ActionItem } from './fetchAllActionItems';
import {
  ActionItemCollection,
  fetchAllActionItemCollections,
} from './fetchAllActionItemCollections';
import { Attribute, fetchAllAttributes } from './fetchAllAttributes';

/**
 * Input to create a new actionItem
 *
 * @param client - GraphQL client
 * @param actionItems - Action item inputs
 * @param actionItemCollectionByTitle - Action item collections indexed by title
 * @param attributeKeysByName - Lookup attribute by name
 */
export async function createActionItems(
  client: GraphQLClient,
  actionItems: ActionItemInput[],
  actionItemCollectionByTitle: { [k in string]: ActionItemCollection },
  // TODO: https://transcend.height.app/T-38961 - insert attributes
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  attributeKeysByName: { [k in string]: Attribute } = {},
): Promise<void> {
  // TODO: https://transcend.height.app/T-38961 - insert attributes
  // const getAttribute = (key: string): string => {
  //   const existing = attributeKeysByName[key];
  //   if (!existing) {
  //     throw new Error(`Attribute key "${key}" does not exist!`);
  //   }
  //   return existing.id;
  // };
  const chunked = chunk(actionItems, 100);
  await mapSeries(chunked, async (chunkToUpload) => {
    await makeGraphQLRequest(client, CREATE_ACTION_ITEMS, {
      input: chunkToUpload.map((actionItem) => ({
        title: actionItem.title,
        type: actionItem.type,
        priorityOverride: actionItem.priority,
        dueDate: actionItem.dueDate,
        customerExperienceActionItemId:
          actionItem.customerExperienceActionItemId,
        resolved: actionItem.resolved,
        notes: actionItem.notes,
        link: actionItem.link,
        assigneesUserEmails: actionItem.users,
        assigneesTeamNames: actionItem.teams,
        ...(actionItem.attributes
          ? {
              // TODO: https://transcend.height.app/T-38961 - insert attributes
              // attributes: actionItem.attributes.map(({ key, values }) => ({
              //   attributeKeyId: getAttribute(key),
              //   attributeValueNames: values,
              // })),
            }
          : {}),
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
 * @param attributeKeysByName - Attribute keys by name
 */
export async function updateActionItem(
  client: GraphQLClient,
  input: ActionItemInput,
  actionItemId: string,
  attributeKeysByName: {
    [k in string]: Attribute;
  } = {},
): Promise<void> {
  const getAttribute = (key: string): string => {
    const existing = attributeKeysByName[key];
    if (!existing) {
      throw new Error(`Attribute key "${key}" does not exist!`);
    }
    return existing.id;
  };
  await makeGraphQLRequest(client, UPDATE_ACTION_ITEMS, {
    input: {
      ids: [actionItemId],
      title: input.title,
      priorityOverride: input.priority,
      dueDate: input.dueDate,
      resolved: input.resolved,
      customerExperienceActionItemId: input.customerExperienceActionItemId,
      notes: input.notes,
      link: input.link,
      assigneesUserEmails: input.users,
      assigneesTeamNames: input.teams,
      ...(input.attributes
        ? {
            attributes: input.attributes.map(({ key, values }) => ({
              attributeKeyId: getAttribute(key),
              attributeValueNames: values,
            })),
          }
        : {}),
    },
  });
}

/**
 * Convert action item to a unique key
 *
 * @param actionItem - action item
 * @returns Unique key
 */
function actionItemToUniqueCode({
  title,
  collections,
}: Pick<ActionItem, 'title' | 'collections'>): string {
  return `${title}-${collections
    .map((c) => c.title)
    .sort()
    .join('-')}`;
}

/**
 * Convert action item to a unique key
 *
 * @param actionItem - action item
 * @returns Unique key
 */
function actionItemInputToUniqueCode({
  title,
  collections,
}: Pick<ActionItemInput, 'title' | 'collections'>): string {
  return `${title}-${collections.sort().join('-')}`;
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

  // Determine if attributes are syncing
  const hasAttributes = inputs.some(
    (input) => input.attributes && input.attributes.length > 0,
  );

  // Fetch existing
  const [existingActionItems, existingActionItemCollections, attributeKeys] =
    await Promise.all([
      fetchAllActionItems(client),
      fetchAllActionItemCollections(client),
      hasAttributes ? fetchAllAttributes(client) : [],
    ]);

  // Look up by title
  const actionItemCollectionByTitle: { [k in string]: ActionItemCollection } =
    keyBy(existingActionItemCollections, 'title');
  const actionItemByTitle: { [k in string]: ActionItem } = keyBy(
    existingActionItems,
    actionItemToUniqueCode,
  );
  const attributeKeysByName = keyBy(attributeKeys, 'name');
  const actionItemByCxId: { [k in string]: ActionItem } = keyBy(
    existingActionItems.filter((x) => !!x.customerExperienceActionItemIds),
    ({ customerExperienceActionItemIds }) => customerExperienceActionItemIds[0],
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
      !actionItemByTitle[actionItemInputToUniqueCode(input)] &&
      !actionItemByCxId[input.customerExperienceActionItemId!],
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
        attributeKeysByName,
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
      actionItemByTitle[actionItemInputToUniqueCode(input)]?.id ||
        actionItemByCxId[input.customerExperienceActionItemId!]?.id,
    ])
    .filter((x): x is [ActionItemInput, string] => !!x[1]);
  await mapSeries(actionItemsToUpdate, async ([input, actionItemId]) => {
    try {
      await updateActionItem(client, input, actionItemId, attributeKeysByName);
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
