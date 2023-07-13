#!/usr/bin/env node

import yargs from 'yargs-parser';
import colors from 'colors';

import { logger } from './logger';
import { skipRequestDataSilos } from './requests';
import { DEFAULT_TRANSCEND_API } from './constants';

/**
 * Given a data silo ID, skip all active privacy requests that are open for that data silo
 *
 * Requires an API key with scope:
 * - "Manage Request Compilation"
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-skip-request-data-silos.ts --auth=$TRANSCEND_API_KEY \
 *   --dataSiloId=92636cda-b7c6-48c6-b1b1-2df574596cbc
 *
 * Standard usage:
 * yarn tr-skip-request-data-silos --auth=$TRANSCEND_API_KEY  \
 *   --dataSiloId=92636cda-b7c6-48c6-b1b1-2df574596cbc
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
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
  await skipRequestDataSilos({
    transcendUrl,
    auth,
    dataSiloId,
  });
}

main();
