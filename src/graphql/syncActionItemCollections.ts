import { ActionItemCollectionInput } from '../codecs';
import { GraphQLClient } from 'graphql-request';
import { mapSeries } from 'bluebird';
import {
  UPDATE_ACTION_ITEM_COLLECTION,
  CREATE_ACTION_ITEM_COLLECTION,
} from './gqls';
import { logger } from '../logger';
import keyBy from 'lodash/keyBy';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import colors from 'colors';
import {
  ActionItemCollection,
  fetchAllActionItemCollections,
} from './fetchAllActionItemCollections';

/**
 * Input to create a new action item collection
 *
 * @param client - GraphQL client
 * @param actionItemCollection - Input
 */
export async function createActionItemCollection(
  client: GraphQLClient,
  actionItemCollection: ActionItemCollectionInput,
): Promise<Pick<ActionItemCollection, 'id' | 'title'>> {
  const input = {
    title: actionItemCollection.title,
    description: actionItemCollection.description || '',
    hidden: actionItemCollection.hidden || false,
    visibleLocations: actionItemCollection['visible-locations'],
  };

  const { createActionItemCollection } = await makeGraphQLRequest<{
    /** Create actionItemCollection mutation */
    createActionItemCollection: {
      /** Created actionItemCollection */
      created: ActionItemCollection;
    };
  }>(client, CREATE_ACTION_ITEM_COLLECTION, {
    input,
  });
  return createActionItemCollection.created;
}

/**
 * Input to update actionItem collection
 *
 * @param client - GraphQL client
 * @param input - Input to update
 * @param actionItemCollectionId - ID of action item collection to update
 */
export async function updateActionItemCollection(
  client: GraphQLClient,
  input: ActionItemCollectionInput,
  actionItemCollectionId: string,
): Promise<void> {
  await makeGraphQLRequest(client, UPDATE_ACTION_ITEM_COLLECTION, {
    input: {
      id: actionItemCollectionId,
      title: input.title,
      description: input.description,
      hidden: input.hidden,
      visibleLocations: input['visible-locations'],
    },
  });
}

/**
 * Sync the action item collections
 *
 * @param client - GraphQL client
 * @param inputs - Inputs to create
 * @returns True if run without error, returns false if an error occurred
 */
export async function syncActionItemCollections(
  client: GraphQLClient,
  inputs: ActionItemCollectionInput[],
): Promise<boolean> {
  let encounteredError = false;
  // Fetch existing
  logger.info(
    colors.magenta(`Syncing "${inputs.length}" action item collections...`),
  );

  // Fetch existing
  const existingActionItemCollections = await fetchAllActionItemCollections(
    client,
  );

  // Look up by title
  const collectionByTitle: { [k in string]: ActionItemCollection } = keyBy(
    existingActionItemCollections,
    'title',
  );

  // Create new actionItems
  const newCollections = inputs.filter(
    (input) => !collectionByTitle[input.title],
  );

  // Create new actionItem collections
  await mapSeries(newCollections, async (input) => {
    try {
      await createActionItemCollection(client, input);
      logger.info(
        colors.green(
          `Successfully created action item collection "${input.title}"!`,
        ),
      );
    } catch (err) {
      encounteredError = true;
      logger.info(
        colors.red(
          `Failed to create action item collection "${input.title}"! - ${err.message}`,
        ),
      );
    }
  });

  // Update all actionItems
  const actionItemsToUpdate = inputs
    .map((input) => [input, collectionByTitle[input.title]?.id])
    .filter((x): x is [ActionItemCollectionInput, string] => !!x[1]);
  await mapSeries(actionItemsToUpdate, async ([input, actionItemId]) => {
    try {
      await updateActionItemCollection(client, input, actionItemId);
      logger.info(
        colors.green(
          `Successfully synced action item collection "${input.title}"!`,
        ),
      );
    } catch (err) {
      encounteredError = true;
      logger.info(
        colors.red(
          `Failed to sync action item collection "${input.title}"! - ${err.message}`,
        ),
      );
    }
  });

  return !encounteredError;
}
