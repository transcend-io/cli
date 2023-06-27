#!/usr/bin/env node

import yargs from 'yargs-parser';
import colors from 'colors';

import { logger } from './logger';
import { pushManualEnrichmentIdentifiersFromCsv } from './manual-enrichment';

/**
 * Push the the set of manually enriched requests back into the Transcend dashboard
 *
 * Requires an API key with scope to Manage Request Identity Verification
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-manual-enrichment-push-identifiers.ts --auth=$TRANSCEND_API_KEY \
 *   --file=/Users/michaelfarrell/Desktop/test.csv
 *
 * Standard usage:
 * yarn tr-manual-enrichment-push-identifiers --auth=$TRANSCEND_API_KEY  \
 *   --file=/Users/michaelfarrell/Desktop/test.csv
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    file = './manual-enrichment-identifiers.csv',
    transcendUrl = 'https://api.transcend.io',
    auth,
    enricherId,
    sombraAuth,
    concurrency = '100',
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

  // Ensure enricherId is provided
  if (!enricherId) {
    logger.error(
      colors.red(
        'An Enricher ID must be provided. ' +
          'You can specify using --enricherId=27d45a0d-7d03-47fa-9b30-6d697005cfcf',
      ),
    );
    process.exit(1);
  }

  // Pull manual enrichment identifiers
  await pushManualEnrichmentIdentifiersFromCsv({
    file,
    transcendUrl,
    enricherId,
    concurrency: parseInt(concurrency, 10),
    auth,
    sombraAuth,
  });
}

main();
