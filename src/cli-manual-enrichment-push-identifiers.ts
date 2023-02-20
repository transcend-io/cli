#!/usr/bin/env node

import yargs from 'yargs-parser';
import colors from 'colors';

import { logger } from './logger';
import { pushManualEnrichmentIdentifiersFromCsv } from './manual-enrichment';

/**
 * Push the the set of manually enriched requests back into the Transcend dashboard
 *
 * Requires an API key with scope to Manage Request Compilation
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-manual-enrichment-push-identifiers.ts --auth=asd123 \
 *   --file=/Users/michaelfarrell/Desktop/test.csv
 *
 * Standard usage:
 * yarn tr-manual-enrichment-push-identifiers --auth=asd123  \
 *   --file=/Users/michaelfarrell/Desktop/test.csv
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    file = './manual-enrichment-identifiers.csv',
    transcendUrl = 'https://api.transcend.io',
    auth,
    sombraAuth,
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

  // Pull manual enrichment identifiers
  await pushManualEnrichmentIdentifiersFromCsv({
    file,
    transcendUrl,
    concurrency: parseInt(concurrency, 10),
    auth,
    sombraAuth,
  });
}

main();
