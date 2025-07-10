#!/usr/bin/env node

import yargs from 'yargs-parser';
import colors from 'colors';

import { logger } from './logger';
import uniq from 'lodash/uniq';
import { pullCustomSiloOutstandingIdentifiers, writeCsv } from './cron';
import { RequestAction } from '@transcend-io/privacy-types';
import { DEFAULT_TRANSCEND_API } from './constants';
import { splitCsvToList } from './requests';
import { map } from 'bluebird';
import {
  buildTranscendGraphQLClient,
  fetchRequestFilesForRequest,
} from './graphql';

/**
 * This is a temporary script that can be removed after the launch of workflows v2
 * TODO: https://transcend.height.app/T-39035 - remove this
 *
 * Requires an API key with:
 *  - scope for "View the Request Compilation"
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-cron-pull-profiles.ts --auth=$TRANSCEND_API_KEY \
 *   --cronDataSiloId=92636cda-b7c6-48c6-b1b1-2df574596cbc \
 *   --targetDataSiloId=40ec5df2-61f7-41e6-80d7-afe7c2f0e390 \
 *   --actions=ERASURE \
 *   --file=/Users/michaelfarrell/Desktop/test.csv \
 *   --fileTarget=/Users/michaelfarrell/Desktop/test-target.csv
 *
 * Standard usage:
 * yarn tr-cron-pull-identifiers --auth=$TRANSCEND_API_KEY  \
 *   --cronDataSiloId=92636cda-b7c6-48c6-b1b1-2df574596cbc \
 *   --targetDataSiloId=40ec5df2-61f7-41e6-80d7-afe7c2f0e390 \
 *   --actions=ERASURE \
 *   --file=/Users/michaelfarrell/Desktop/test.csv \
 *   --fileTarget=/Users/michaelfarrell/Desktop/test-target.csv
 *
 * With chunking:
 * yarn tr-cron-pull-identifiers --auth=$TRANSCEND_API_KEY  \
 *   --cronDataSiloId=92636cda-b7c6-48c6-b1b1-2df574596cbc \
 *   --targetDataSiloId=40ec5df2-61f7-41e6-80d7-afe7c2f0e390 \
 *   --actions=ERASURE \
 *   --file=/Users/michaelfarrell/Desktop/test.csv \
 *   --fileTarget=/Users/michaelfarrell/Desktop/test-target.csv \
 *   --chunkSize=1000
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    file = './cron-identifiers.csv',
    fileTarget = './cron-identifiers-target.csv',
    transcendUrl = DEFAULT_TRANSCEND_API,
    auth,
    sombraAuth,
    cronDataSiloId,
    targetDataSiloId,
    actions,
    pageLimit = '100',
    chunkSize = '20000',
  } = yargs(process.argv.slice(2)) as { [k in string]: string };

  // Ensure auth is passed
  if (!auth) {
    logger.error(
      colors.red(
        'A Transcend API key must be provided. You can specify using --auth=$TRANSCEND_API_KEY',
      ),
    );
    process.exit(1);
  }

  // Ensure cronDataSiloId
  if (!cronDataSiloId) {
    logger.error(
      colors.red(
        'A cronDataSiloId must be provided. You can specify using --cronDataSiloId=92636cda-b7c6-48c6-b1b1-2df574596cbc',
      ),
    );
    process.exit(1);
  }

  // Ensure targetDataSiloId
  if (!targetDataSiloId) {
    logger.error(
      colors.red(
        'A targetDataSiloId must be provided. You can specify using --targetDataSiloId=40ec5df2-61f7-41e6-80d7-afe7c2f0e390',
      ),
    );
    process.exit(1);
  }

  // Ensure actions
  if (!actions) {
    logger.error(
      colors.red(
        'At least one action must be provided. You can specify using --actions=ERASURE',
      ),
    );
    process.exit(1);
  }

  // Validate actions
  const parsedActions = splitCsvToList(actions) as RequestAction[];
  const invalidActions = parsedActions.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (type) => !Object.values(RequestAction).includes(type as any),
  );
  if (invalidActions.length > 0) {
    logger.error(
      colors.red(
        `Failed to parse actions:"${invalidActions.join(',')}".\n` +
        `Expected one of: \n${Object.values(RequestAction).join('\n')}`,
      ),
    );
    process.exit(1);
  }

  // Parse chunkSize if provided
  const parsedChunkSize = chunkSize ? parseInt(chunkSize, 10) : 20000;
  if (chunkSize && (Number.isNaN(parsedChunkSize) || parsedChunkSize <= 0)) {
    logger.error(
      colors.red(
        'chunkSize must be a positive integer. You can specify using --chunkSize=1000',
      ),
    );
    process.exit(1);
  }

  // Create GraphQL client to connect to Transcend backend
  const client = buildTranscendGraphQLClient(transcendUrl, auth);

  // Helper function to generate chunked file names
  const getChunkedFileName = (baseFileName: string, chunkNumber: number): string => {
    if (!parsedChunkSize) return baseFileName;

    const lastDotIndex = baseFileName.lastIndexOf('.');
    const baseName = lastDotIndex !== -1 ? baseFileName.substring(0, lastDotIndex) : baseFileName;
    const extension = lastDotIndex !== -1 ? baseFileName.substring(lastDotIndex) : '.csv';

    return `${baseName}_chunk${chunkNumber}${extension}`;
  };

  // Helper function to process target identifiers for a chunk
  const processTargetIdentifiers = async (identifiers: {
    [k in string]: string | null | boolean | number;
  }[]): Promise<{
    /** The record ID for the target identifier */
    RecordId: string;
    /** The object type for the target identifier */
    Object: string | undefined;
    /** The comment for the target identifier */
    Comment: string;
  }[]> => {
    // Grab the requestIds from the list of silos to process
    const requestIds = identifiers.map((d) => d.requestId as string);

    // Pull down target identifiers
    const results = await map(
      uniq(requestIds),
      async (requestId) => {
        const results = await fetchRequestFilesForRequest(client, {
          requestId,
          dataSiloId: targetDataSiloId,
        });
        return results.map(({ fileName, remoteId }) => {
          if (!remoteId) {
            throw new Error(
              `Failed to find remoteId for ${fileName} request: ${requestId}`,
            );
          }
          return {
            RecordId: remoteId,
            Object: fileName
              .replace('.json', '')
              .split('/')
              .pop()
              ?.replace(' Information', ''),
            Comment: 'Customer data deletion request submitted via transcend.io',
          };
        });
      },
      {
        concurrency: 10,
      },
    );

    return results.flat();
  };

  if (parsedChunkSize) {
    // Chunked processing
    logger.info(
      colors.blue(
        `Processing identifiers in chunks of ${parsedChunkSize}...`,
      ),
    );

    await pullCustomSiloOutstandingIdentifiers({
      transcendUrl,
      pageLimit: parseInt(pageLimit, 10),
      actions: parsedActions,
      auth,
      sombraAuth,
      dataSiloId: cronDataSiloId,
      chunkSize: parsedChunkSize,
      skipRequestCount: true,
      onChunk: async ({ identifiersFormattedForCsv, isLastChunk, chunkNumber }) => {
        // Process target identifiers for this chunk
        const targetIdentifiers = await processTargetIdentifiers(identifiersFormattedForCsv);

        // Generate chunked file names
        const chunkedFile = getChunkedFileName(file, chunkNumber);
        const chunkedFileTarget = getChunkedFileName(fileTarget, chunkNumber);

        // Write CSV files for this chunk
        const headers = uniq(
          identifiersFormattedForCsv.map((d) => Object.keys(d)).flat(),
        );
        await writeCsv(chunkedFile, identifiersFormattedForCsv, headers);
        logger.info(
          colors.green(
            `Successfully wrote ${identifiersFormattedForCsv.length} identifiers to file "${chunkedFile}"`,
          ),
        );

        const headers2 = uniq(targetIdentifiers.map((d) => Object.keys(d)).flat());
        await writeCsv(chunkedFileTarget, targetIdentifiers, headers2);
        logger.info(
          colors.green(
            `Successfully wrote ${targetIdentifiers.length} target identifiers to file "${chunkedFileTarget}"`,
          ),
        );

        if (isLastChunk) {
          logger.info(
            colors.blue(
              `Completed processing all chunks. Processed ${chunkNumber} total chunks.`,
            ),
          );
        }
      },
    });
  } else {
    // Original non-chunked processing
    const { identifiersFormattedForCsv } =
      await pullCustomSiloOutstandingIdentifiers({
        transcendUrl,
        pageLimit: parseInt(pageLimit, 10),
        actions: parsedActions,
        auth,
        sombraAuth,
        dataSiloId: cronDataSiloId,
        skipRequestCount: true,
      });

    // Process target identifiers
    const targetIdentifiers = await processTargetIdentifiers(identifiersFormattedForCsv);

    // Write CSV
    const headers = uniq(
      identifiersFormattedForCsv.map((d) => Object.keys(d)).flat(),
    );
    await writeCsv(file, identifiersFormattedForCsv, headers);
    logger.info(
      colors.green(
        `Successfully wrote ${identifiersFormattedForCsv.length} identifiers to file "${file}"`,
      ),
    );

    const headers2 = uniq(targetIdentifiers.map((d) => Object.keys(d)).flat());
    await writeCsv(fileTarget, targetIdentifiers, headers2);
    logger.info(
      colors.green(
        `Successfully wrote ${targetIdentifiers.length} target identifiers to file "${fileTarget}"`,
      ),
    );
  }
}

main();
