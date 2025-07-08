#!/usr/bin/env node

import yargs from 'yargs-parser';
import colors from 'colors';

import { logger } from '../logger';
import { skipPreflightJobs, splitCsvToList } from './requests';
import { DEFAULT_TRANSCEND_API } from '../constants';

/**
 * Given an enricher ID, skip all active enrichment jobs that are open for that enricher
 *
 * Requires an API key with scope:
 * - "Manage Request Compilation"
 *
 * Dev Usage:
 * pnpm exec tsx ./src/cli-skip-preflight-jobs.ts --auth=$TRANSCEND_API_KEY \
 *   --enricherIds=92636cda-b7c6-48c6-b1b1-2df574596cbc
 *
 * Standard usage:
 * yarn tr-skip-request-data-silos --auth=$TRANSCEND_API_KEY  \
 *   --enricherIds=92636cda-b7c6-48c6-b1b1-2df574596cbc
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    /** Transcend Backend URL */
    transcendUrl = DEFAULT_TRANSCEND_API,
    /** API key */
    auth,
    /** Enricher ID to mark requests fpr */
    enricherIds,
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

  // Ensure enricherIds is provided
  if (!enricherIds) {
    logger.error(
      colors.red(
        'An enricher ID must be provided. You can specify using --enricherIds=2560bb81-b837-4c6f-a57e-dcef87069d43',
      ),
    );
    process.exit(1);
  }

  // Upload privacy requests
  await skipPreflightJobs({
    transcendUrl,
    auth,
    enricherIds: splitCsvToList(enricherIds),
  });
}
main();
