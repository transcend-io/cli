#!/usr/bin/env node

import yargs from 'yargs-parser';
import colors from 'colors';

import { logger } from '../logger';
import { pushCronIdentifiersFromCsv } from './cron';
import { DEFAULT_TRANSCEND_API } from '../constants';

/**
 * Mark all of the identifiers in a cron job CSV as completed.
 *
 * Requires an API key with scope for the cron integration being checked on.
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-cron-mark-identifiers-completed.ts --auth=$TRANSCEND_API_KEY \
 *   --dataSiloId=92636cda-b7c6-48c6-b1b1-2df574596cbc \
 *   --file=/Users/michaelfarrell/Desktop/test.csv
 *
 * Standard usage:
 * yarn tr-pull-cron-mark-identifiers-completed --auth=$TRANSCEND_API_KEY  \
 *   --dataSiloId=92636cda-b7c6-48c6-b1b1-2df574596cbc \
 *   --file=/Users/michaelfarrell/Desktop/test.csv
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    file = './cron-identifiers.csv',
    transcendUrl = DEFAULT_TRANSCEND_API,
    auth,
    sombraAuth,
    dataSiloId,
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

  // Upload privacy requests
  await pushCronIdentifiersFromCsv({
    file,
    transcendUrl,
    auth,
    sombraAuth,
    dataSiloId,
  });
}

main();
