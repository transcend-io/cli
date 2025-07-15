#!/usr/bin/env node

import yargs from 'yargs-parser';
import colors from 'colors';
import { RequestAction } from '@transcend-io/privacy-types';

import { logger } from '../logger';
import { retryRequestDataSilos } from './requests';
import { DEFAULT_TRANSCEND_API } from '../constants';

/**
 * Bulk wipe and retry a set of requests for a specific data silo
 *
 * Requires an API key with scope:
 * - "Manage Request Compilation"
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-retry-request-data-silos.ts --auth=$TRANSCEND_API_KEY \
 *   --dataSiloId=92636cda-b7c6-48c6-b1b1-2df574596cbc \
 *   --actions=ACCESS,ERASURE
 *
 * Standard usage:
 * yarn tr-retry-request-data-silos --auth=$TRANSCEND_API_KEY  \
 *   --dataSiloId=92636cda-b7c6-48c6-b1b1-2df574596cbc \
 *   --actions=ACCESS,ERASURE
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    transcendUrl = DEFAULT_TRANSCEND_API,
    auth,
    dataSiloId,
    actions,
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

  // Parse request actions
  if (!actions) {
    logger.error(
      colors.red(
        'Missing required parameter "actions". e.g. --actions=ERASURE,ACCESS',
      ),
    );
    process.exit(1);
  }
  const requestActions = actions.split(',') as RequestAction[];
  const invalidActions = requestActions.filter(
    (action) => !Object.values(RequestAction).includes(action),
  );
  if (invalidActions.length > 0) {
    logger.error(
      colors.red(
        `Received invalid action values: "${invalidActions.join(',')}"`,
      ),
    );
    process.exit(1);
  }

  // Upload privacy requests
  await retryRequestDataSilos({
    requestActions,
    transcendUrl,
    auth,
    dataSiloId,
  });
}

main();
