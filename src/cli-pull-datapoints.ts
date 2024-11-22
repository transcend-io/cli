#!/usr/bin/env node
import uniq from 'lodash/uniq';
import groupBy from 'lodash/groupBy';

import yargs from 'yargs-parser';
import { logger } from './logger';
import colors from 'colors';
import { buildTranscendGraphQLClient } from './graphql';
import { ADMIN_DASH_DATAPOINTS, DEFAULT_TRANSCEND_API } from './constants';
import { pullAllDatapoints } from './data-inventory';
import { writeCsv } from './cron';
import { splitCsvToList } from './requests';
import { DataCategoryType } from '@transcend-io/privacy-types';

/**
 * Sync datapoints from Transcend inventory to a CSV
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-pull-datapoints.ts --auth=$TRANSCEND_API_KEY
 *
 * Standard usage
 * yarn cli-pull-datapoints --auth=$TRANSCEND_API_KEY
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    file = './datapoints.csv',
    transcendUrl = DEFAULT_TRANSCEND_API,
    auth,
    dataSiloIds = '',
    includeAttributes = 'false',
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (type) => !Object.values(DataCategoryType).includes(type as any),
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

    const dataPoints = await pullAllDatapoints(client, {
      dataSiloIds: splitCsvToList(dataSiloIds),
      includeGuessedCategories: includeGuessedCategories === 'true',
      parentCategories: parsedParentCategories,
      includeAttributes: includeAttributes === 'true',
      subCategories: splitCsvToList(subCategories), // TODO: https://transcend.height.app/T-40482 - do by name not ID
    });

    logger.info(colors.magenta(`Writing datapoints to file "${file}"...`));
    let headers: string[] = [];
    const inputs = dataPoints.map((point) => {
      const result = {
        'Property ID': point.id,
        'Data Silo': point.dataSilo.title,
        Object: point.dataPoint.name,
        'Object Path': point.dataPoint.path.join('.'),
        Property: point.name,
        'Property Description': point.description,
        'Data Categories': point.categories
          .map((category) => `${category.category}:${category.name}`)
          .join(', '),
        'Guessed Category': point.pendingCategoryGuesses?.[0]
          ? `${point.pendingCategoryGuesses![0]!.category.category}:${
              point.pendingCategoryGuesses![0]!.category.name
            }`
          : '',
        'Processing Purposes': point.purposes
          .map((purpose) => `${purpose.purpose}:${purpose.name}`)
          .join(', '),
        ...Object.entries(
          groupBy(
            point.attributeValues || [],
            ({ attributeKey }) => attributeKey.name,
          ),
        ).reduce((acc, [key, values]) => {
          acc[key] = values.map((value) => value.name).join(',');
          return acc;
        }, {} as Record<string, string>),
      };
      headers = uniq([...headers, ...Object.keys(result)]);
      return result;
    });
    writeCsv(file, inputs, headers);
  } catch (err) {
    logger.error(
      colors.red(`An error occurred syncing the datapoints: ${err.message}`),
    );
    process.exit(1);
  }

  // Indicate success
  logger.info(
    colors.green(
      `Successfully synced datapoints to disk at ${file}! View at ${ADMIN_DASH_DATAPOINTS}`,
    ),
  );
}

main();
