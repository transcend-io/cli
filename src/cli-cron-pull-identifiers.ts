#!/usr/bin/env node

import yargs from 'yargs-parser';
import colors from 'colors';

import { logger } from './logger';
import uniq from 'lodash/uniq';
import { CsvFormattedIdentifier, parseFilePath, pullChunkedCustomSiloOutstandingIdentifiers, writeCsv } from './cron';
import { RequestAction } from '@transcend-io/privacy-types';
import { DEFAULT_TRANSCEND_API } from './constants';
import { splitCsvToList } from './requests';

/**
 * Pull the set of active identifiers for a cron job silo.
 *
 * For large datasets, the output will be automatically split into multiple CSV files
 * to avoid file system size limits. Use --chunkSize to control the number of rows per file.
 *
 * Requires an API key with scope for the cron integration being checked on.
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-cron-pull-identifiers.ts --auth=$TRANSCEND_API_KEY \
 *   --dataSiloId=92636cda-b7c6-48c6-b1b1-2df574596cbc \
 *   --actions=ERASURE \
 *   --file=/Users/michaelfarrell/Desktop/test.csv \
 *   --chunkSize=100000
 *
 * Standard usage:
 * yarn tr-cron-pull-identifiers --auth=$TRANSCEND_API_KEY  \
 *   --dataSiloId=92636cda-b7c6-48c6-b1b1-2df574596cbc \
 *   --actions=ERASURE \
 *   --file=/Users/michaelfarrell/Desktop/test.csv \
 *   --chunkSize=100000
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    file = './cron-identifiers.csv',
    transcendUrl = DEFAULT_TRANSCEND_API,
    auth,
    sombraAuth,
    dataSiloId,
    actions,
    pageLimit = '100',
    skipRequestCount = false,
    chunkSize = '10000',
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

  if (!dataSiloId) {
    logger.error(
      colors.red(
        'A data silo ID must be provided. You can specify using --dataSiloId=92636cda-b7c6-48c6-b1b1-2df574596cbc',
      ),
    );
    process.exit(1);
  }

  if (!actions) {
    logger.error(
      colors.red(
        'At least one action must be provided. You can specify using --actions=ERASURE',
      ),
    );
    process.exit(1);
  }

  if (skipRequestCount === 'true') {
    logger.info(
      colors.yellow(
        'Skipping request count as requested. This may help speed up the call.',
      ),
    );
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

  const parsedPageLimit = parseInt(pageLimit, 10);
  const parsedChunkSize = parseInt(chunkSize, 10);
  if (Number.isNaN(parsedChunkSize) || parsedChunkSize <= 0 || parsedChunkSize % parsedPageLimit !== 0) {
    logger.error(
      colors.red(
        `Invalid chunk size: "${chunkSize}". Must be a positive integer that is a multiple of ${parsedPageLimit}.`,
      ),
    );
    process.exit(1);
  }
  const { baseName, extension } = parseFilePath(file);
  let fileCount = 0;

  const onSave = (chunk: CsvFormattedIdentifier[]): Promise<void> => {
    const numberedFileName = `${baseName}-${fileCount}${extension}`;
    logger.info(
      colors.blue(
        `Saving ${chunk.length} identifiers to file "${numberedFileName}"`,
      ),
    );

    const headers = uniq(chunk.map((d) => Object.keys(d)).flat());
    writeCsv(numberedFileName, chunk, headers);
    logger.info(
      colors.green(
        `Successfully wrote ${chunk.length} identifiers to file "${numberedFileName}"`,
      ),
    );
    fileCount += 1;
    return Promise.resolve();
  };

  // Pull down outstanding identifiers
  await pullChunkedCustomSiloOutstandingIdentifiers({
    transcendUrl,
    apiPageSize: parsedPageLimit,
    savePageSize: parsedChunkSize,
    onSave,
    actions: parsedActions,
    auth,
    sombraAuth,
    dataSiloId,
    skipRequestCount: skipRequestCount === 'true',
  });
}

main();
