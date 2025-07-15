#!/usr/bin/env node

import yargs from 'yargs-parser';
import colors from 'colors';

import { logger } from '../logger';
import { uploadDataFlowsFromCsv } from './consent-manager';
import { ConsentTrackerStatus } from '@transcend-io/privacy-types';
import { DEFAULT_TRANSCEND_API } from '../constants';

/**
 * Upload a CSV of data flows
 *
 * Requires an API key with follow scopes: https://app.transcend.io/infrastructure/api-keys
 *    - "Manage Data Flows"
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-upload-data-flows-from-csv.ts --auth=$TRANSCEND_API_KEY \
 *   --file=/Users/michaelfarrell/Desktop/test.csv \
 *   --trackerStatus=LIVE
 *
 * Standard usage:
 * yarn tr-upload-data-flows-from-csv --auth=$TRANSCEND_API_KEY \
 *   --file=/Users/michaelfarrell/Desktop/test.csv \
 *   --trackerStatus=LIVE
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    auth,
    trackerStatus,
    classifyService = 'false',
    file = './data-flows.csv',
    transcendUrl = DEFAULT_TRANSCEND_API,
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

  // Ensure trackerStatus is passed
  const VALID_TRACKER_OPTIONS = Object.values(ConsentTrackerStatus);
  if (!trackerStatus) {
    logger.error(
      colors.red(
        'The trackerStatus must be provided. You can specify using --trackerStatus=LIVE. ' +
          `Valid options include: ${VALID_TRACKER_OPTIONS.join(',')}`,
      ),
    );
    process.exit(1);
  }

  const consentTrackerStatus = trackerStatus as ConsentTrackerStatus;
  if (!VALID_TRACKER_OPTIONS.includes(consentTrackerStatus)) {
    logger.error(
      colors.red(
        `The trackerStatus option was invalid, got: "${trackerStatus}". You can specify using --trackerStatus=LIVE. ` +
          `Valid options include: ${VALID_TRACKER_OPTIONS.join(',')}`,
      ),
    );
    process.exit(1);
  }

  // Upload data flows
  await uploadDataFlowsFromCsv({
    auth,
    trackerStatus: consentTrackerStatus,
    file,
    classifyService: classifyService === 'true',
    transcendUrl,
  });
}

main();
