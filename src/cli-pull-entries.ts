#!/usr/bin/env node
import type { UnstructuredSubDataPointRecommendationStatus } from '@transcend-io/privacy-types';
import colors from 'colors';
import uniq from 'lodash/uniq';
import yargs from 'yargs-parser';
import { DEFAULT_TRANSCEND_API } from './constants';
import { writeCsv } from './cron';
import { pullUnstructuredSubDataPointRecommendations } from './data-inventory';
import { buildTranscendGraphQLClient } from './graphql';
import { logger } from './logger';
import { splitCsvToList } from './requests';

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
    subCategories = '',
    status = '',
    includeEncryptedSnippets = 'false',
    includeEncryptedSamplesS3Key = 'false',
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
  const includeEncryptedSnippetsBool = includeEncryptedSnippets === 'true';
  const includeEncryptedSamplesS3KeyBool =
    includeEncryptedSamplesS3Key === 'true';

  try {
    // Create a GraphQL client
    const client = buildTranscendGraphQLClient(transcendUrl, auth);

    const entries = await pullUnstructuredSubDataPointRecommendations(client, {
      dataSiloIds: splitCsvToList(dataSiloIds),
      subCategories: splitCsvToList(subCategories), // TODO: https://transcend.height.app/T-40482 - do by name not ID
      status: splitCsvToList(
        status,
      ) as UnstructuredSubDataPointRecommendationStatus[],
      includeEncryptedSnippets: includeEncryptedSnippetsBool,
      includeEncryptedSamplesS3Key: includeEncryptedSamplesS3KeyBool,
    });

    logger.info(colors.magenta(`Writing entries to file "${file}"...`));
    let headers: string[] = [];
    const inputs = entries.map((entry) => {
      const result = {
        'Entry ID': entry.id,
        'Data Silo ID': entry.dataSiloId, // FIXME
        'Object Path ID': entry.scannedObjectPathId, // FIXME
        Object: entry.scannedObject.name,
        ...(includeEncryptedSnippetsBool
          ? { Entry: entry.name, 'Context Snippet': entry.contextSnippet }
          : {}),
        'Data Category': `${entry.dataSubCategory.category}:${entry.dataSubCategory.name}`,
        'Classification Status': entry.status,
        'Confidence Score': entry.confidence,
        'Classification Method': entry.classificationMethod,
        'Classifier Version': entry.classifierVersion,
        ...(includeEncryptedSnippetsBool
          ? {
              'Encrypted Samples S3 Key':
                entry.scannedObject.encryptedSamplesS3Key,
            }
          : {}),
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
