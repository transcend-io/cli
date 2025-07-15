import { DataCategoryInput } from '../../codecs';
import { GraphQLClient } from 'graphql-request';
import { mapSeries } from 'bluebird';
import { UPDATE_DATA_SUB_CATEGORIES, CREATE_DATA_SUB_CATEGORY } from './gqls';
import { logger } from '../../logger';
import keyBy from 'lodash/keyBy';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import colors from 'colors';
import {
  fetchAllDataCategories,
  DataSubCategory,
} from './fetchAllDataCategories';

/**
 * Input to create a new data category
 *
 * @param client - GraphQL client
 * @param dataCategory - Input
 */
export async function createDataCategory(
  client: GraphQLClient,
  dataCategory: DataCategoryInput,
): Promise<Pick<DataSubCategory, 'id' | 'name' | 'category'>> {
  const input = {
    name: dataCategory.name,
    category: dataCategory.category,
    description: dataCategory.description,
    // TODO: https://transcend.height.app/T-31994 - add attributes, teams, owners
  };

  const { createDataCategory } = await makeGraphQLRequest<{
    /** Create data category mutation */
    createDataCategory: {
      /** Created data category */
      dataCategory: DataSubCategory;
    };
  }>(client, CREATE_DATA_SUB_CATEGORY, {
    input,
  });
  return createDataCategory.dataCategory;
}

/**
 * Input to update data categories
 *
 * @param client - GraphQL client
 * @param dataCategoryIdPairs - [DataCategoryInput, dataCategoryId] list
 */
export async function updateDataCategories(
  client: GraphQLClient,
  dataCategoryIdPairs: [DataCategoryInput, string][],
): Promise<void> {
  await makeGraphQLRequest(client, UPDATE_DATA_SUB_CATEGORIES, {
    input: {
      dataSubCategories: dataCategoryIdPairs.map(([dataCategory, id]) => ({
        id,
        description: dataCategory.description,
        // TODO: https://transcend.height.app/T-31994 - add  teams, owners
        attributes: dataCategory.attributes,
      })),
    },
  });
}

/**
 * Sync the data inventory data categories
 *
 * @param client - GraphQL client
 * @param inputs - Inputs to create
 * @returns True if run without error, returns false if an error occurred
 */
export async function syncDataCategories(
  client: GraphQLClient,
  inputs: DataCategoryInput[],
): Promise<boolean> {
  // Fetch existing
  logger.info(colors.magenta(`Syncing "${inputs.length}" data categories...`));

  let encounteredError = false;

  // Fetch existing
  const existingDataCategories = await fetchAllDataCategories(client);

  // Look up by name
  const dataCategoryByName: {
    [k in string]: Pick<DataSubCategory, 'id' | 'name' | 'category'>;
  } = keyBy(
    existingDataCategories,
    ({ name, category }) => `${name}:${category}`,
  );

  // Create new data categories
  const newDataCategories = inputs.filter(
    (input) => !dataCategoryByName[`${input.name}:${input.category}`],
  );

  // Create new data categories
  await mapSeries(newDataCategories, async (dataCategory) => {
    try {
      const newDataCategory = await createDataCategory(client, dataCategory);
      dataCategoryByName[
        `${newDataCategory.name}:${newDataCategory.category}`
      ] = newDataCategory;
      logger.info(
        colors.green(
          `Successfully synced data category "${dataCategory.name}"!`,
        ),
      );
    } catch (err) {
      encounteredError = true;
      logger.info(
        colors.red(
          `Failed to sync data category "${dataCategory.name}"! - ${err.message}`,
        ),
      );
    }
  });

  // Update all data categories
  try {
    logger.info(colors.magenta(`Updating "${inputs.length}" data categories!`));
    await updateDataCategories(
      client,
      inputs.map((input) => [
        input,
        dataCategoryByName[`${input.name}:${input.category}`].id,
      ]),
    );
    logger.info(
      colors.green(`Successfully synced "${inputs.length}" data categories!`),
    );
  } catch (err) {
    encounteredError = true;
    logger.info(
      colors.red(
        `Failed to sync "${inputs.length}" data categories ! - ${err.message}`,
      ),
    );
  }

  return !encounteredError;
}
