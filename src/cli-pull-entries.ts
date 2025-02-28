#!/usr/bin/env node
import uniq from 'lodash/uniq';

import yargs from 'yargs-parser';
import { logger } from './logger';
import colors from 'colors';
import { buildTranscendGraphQLClient } from './graphql';
import { DEFAULT_TRANSCEND_API } from './constants';
import { pullUnstructuredSubDataPointRecommendations } from './data-inventory';
import { writeCsv } from './cron';
import { splitCsvToList } from './requests';
import { DataCategoryType } from '@transcend-io/privacy-types';

/**
 * Sync entries from Transcend inventory to a CSV
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-pull-entries.ts --auth=$TRANSCEND_API_KEY
 *
 * Standard usage
 * yarn cli-pull-entries --auth=$TRANSCEND_API_KEY
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    file = './entries.csv',
    transcendUrl = DEFAULT_TRANSCEND_API,
    auth,
    dataSiloIds = '',
    includeGuessedCategories = 'false',
    parentCategories = '',
    subCategories = '',
  } = yargs(process.argv.slice(2));

  // Ensure auth is passed
  if (!auth) {
    logger.error(
      colors.red(
        'A Transcend API key must be provided. You can specify using --auth=$TRANSCEND_API_KEY',
      ),
    );
    process.exit(1);
  }

  // Validate trackerStatuses
  const parsedParentCategories = splitCsvToList(
    parentCategories,
  ) as DataCategoryType[];
  const invalidParentCategories = parsedParentCategories.filter(
    (type) => !Object.values(DataCategoryType).includes(type),
  );
  if (invalidParentCategories.length > 0) {
    logger.error(
      colors.red(
        `Failed to parse parentCategories:"${invalidParentCategories.join(
          ',',
        )}".\n` +
          `Expected one of: \n${Object.values(DataCategoryType).join('\n')}`,
      ),
    );
    process.exit(1);
  }

  try {
    // Create a GraphQL client
    const client = buildTranscendGraphQLClient(transcendUrl, auth);

    const entries = await pullUnstructuredSubDataPointRecommendations(client, {
      dataSiloIds: splitCsvToList(dataSiloIds),
      includeGuessedCategories: includeGuessedCategories === 'true',
      parentCategories: parsedParentCategories,
      subCategories: splitCsvToList(subCategories), // TODO: https://transcend.height.app/T-40482 - do by name not ID
    });

    logger.info(colors.magenta(`Writing entries to file "${file}"...`));
    let headers: string[] = [];
    const inputs = entries.map((entry) => {
      const result = {
        'Property ID': entry.id,
        'Data Silo': entry.dataSiloId, // FIXME
        Object: entry.scannedObjectId, // FIXME
        'Object Path': entry.scannedObjectPathId, // FIXME
        Property: entry.name,
        'Data Category': `${entry.dataSubCategory.category}:${entry.dataSubCategory.name}`,
        // 'Guessed Category': entry.pendingCategoryGuesses?.[0]
        //   ? `${entry.pendingCategoryGuesses![0]!.category.category}:${
        //       entry.pendingCategoryGuesses![0]!.category.name
        //     }`
        //   : '',
      };
      headers = uniq([...headers, ...Object.keys(result)]);
      return result;
    });
    writeCsv(file, inputs, headers);
  } catch (err) {
    logger.error(
      colors.red(`An error occurred syncing the entries: ${err.message}`),
    );
    process.exit(1);
  }

  // Indicate success
  logger.info(colors.green(`Successfully synced entries to disk at ${file}!`));
}

main();
