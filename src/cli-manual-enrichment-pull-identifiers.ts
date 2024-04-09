#!/usr/bin/env node

import colors from 'colors';
import yargs from 'yargs-parser';

import { RequestAction } from '@transcend-io/privacy-types';
import { DEFAULT_TRANSCEND_API } from './constants';
import { logger } from './logger';
import { pullManualEnrichmentIdentifiersToCsv } from './manual-enrichment';

/**
 * Pull the the set of requests that actively require manual enrichment.
 *
 * Requires an API key with scope to View Incoming Requests
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-manual-enrichment-pull-identifiers.ts --auth=$TRANSCEND_API_KEY \
 *   --actions=ERASURE \
 *   --file=/Users/michaelfarrell/Desktop/test.csv \
 *   --decrypt
 *
 * Standard usage:
 * yarn tr-manual-enricher-pull-identifiers --auth=$TRANSCEND_API_KEY  \
 *   --actions=ERASURE \
 *   --file=/Users/michaelfarrell/Desktop/test.csv \
 *   --decrypt
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    file = './manual-enrichment-identifiers.csv',
    transcendUrl = DEFAULT_TRANSCEND_API,
    auth,
    sombraAuth,
    actions = '',
    concurrency = '100',
    decrypt = 'false',
  } = yargs(process.argv.slice(2)) as { [k in string]: string };

  // Ensure auth is passed if not decrypting
  if (!decrypt && !auth) {
    logger.error(
      colors.red(
        'A Transcend API key must be provided. You can specify using --auth=$TRANSCEND_API_KEY',
      ),
    );
    process.exit(1);
  }

  // Validate actions
  const requestActions = actions
    .split(',')
    .filter((x) => !!x) as RequestAction[];
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

  // Pull manual enrichment identifiers
  await pullManualEnrichmentIdentifiersToCsv({
    file,
    transcendUrl,
    concurrency: parseInt(concurrency, 10),
    requestActions,
    auth,
    sombraAuth,
    decrypt: decrypt === 'true',
  });
}

main();
