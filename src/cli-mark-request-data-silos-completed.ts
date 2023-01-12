#!/usr/bin/env node

import yargs from 'yargs-parser';
import colors from 'colors';

import { logger } from './logger';
import { markRequestDataSiloIdsCompleted } from './cron';

/**
 * Given a set of Request IDs and a Data Silo ID, mark the RequestDataSilos as completed
 *
 * Requires an API key with scope:
 * - "Manage Request Compilation"
 *
 * Dev Usage:
 * yarn ts-node ./src/mark-request-data-silos-completed..ts --auth=asd123 \
 *   --dataSiloId=92636cda-b7c6-48c6-b1b1-2df574596cbc \
 *   --file=/Users/michaelfarrell/Desktop/test.csv
 *
 * Standard usage:
 * yarn tr-mark-request-data-silos-completed. --auth=asd123  \
 *   --dataSiloId=92636cda-b7c6-48c6-b1b1-2df574596cbc \
 *   --file=/Users/michaelfarrell/Desktop/test.csv
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    file = './request-identifiers.csv',
    transcendUrl = 'https://api.transcend.io',
    auth,
    dataSiloId,
  } = yargs(process.argv.slice(2)) as { [k in string]: string };

  // Ensure auth is passed
  if (!auth) {
    logger.error(
      colors.red(
        'A Transcend API key must be provided. You can specify using --auth=asd123',
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
