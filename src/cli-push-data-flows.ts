#!/usr/bin/env node

import yargs from 'yargs-parser';
import colors from 'colors';

import { logger } from './logger';
import { pushDataFlowsFromCsv } from './data-flows';

/**
 * Mark all of the identifiers in a cron job CSV as completed.
 *
 * Requires an API key with scope to:
 * - Manage Data Flows
 * - View Consent Manager
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-push-data-flows.ts --auth=asd123 \
 *   --file=/Users/michaelfarrell/Desktop/test.csv
 *
 * Standard usage:
 * yarn tr-push-data-flows --auth=asd123  \
 *   --file=/Users/michaelfarrell/Desktop/test.csv
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    file = './data-flows.csv',
    transcendUrl = 'https://api.transcend.io',
    auth,
    concurrency = '100',
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
  await pushDataFlowsFromCsv({
    file,
    transcendUrl,
    concurrency: parseInt(concurrency, 10),
    auth,
  });
}

main();
