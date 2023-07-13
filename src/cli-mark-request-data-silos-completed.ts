#!/usr/bin/env node

import yargs from 'yargs-parser';
import colors from 'colors';

import { logger } from './logger';
import { markRequestDataSiloIdsCompleted } from './cron';
import { DEFAULT_TRANSCEND_API } from './constants';

/**
 * Given a set of Request IDs and a Data Silo ID, mark the RequestDataSilos as completed
 *
 * Requires an API key with scope:
 * - "Manage Request Compilation"
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-mark-request-data-silos-completed.ts --auth=$TRANSCEND_API_KEY \
 *   --dataSiloId=92636cda-b7c6-48c6-b1b1-2df574596cbc \
 *   --file=/Users/michaelfarrell/Desktop/test.csv
 *
 * Standard usage:
 * yarn tr-mark-request-data-silos-completed --auth=$TRANSCEND_API_KEY  \
 *   --dataSiloId=92636cda-b7c6-48c6-b1b1-2df574596cbc \
 *   --file=/Users/michaelfarrell/Desktop/test.csv
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    file = './request-identifiers.csv',
    transcendUrl = DEFAULT_TRANSCEND_API,
    auth,
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

  // Ensure dataSiloId is provided
  if (!dataSiloId) {
    logger.error(
      colors.red(
        'A Data Silo ID must be provided. You can specify using --dataSiloId=2560bb81-b837-4c6f-a57e-dcef87069d43',
      ),
    );
    process.exit(1);
  }

  // Upload privacy requests
  await markRequestDataSiloIdsCompleted({
    file,
    transcendUrl,
    auth,
    dataSiloId,
  });
}

main();
