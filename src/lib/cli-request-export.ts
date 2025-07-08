#!/usr/bin/env node

import yargs from 'yargs-parser';
import colors from 'colors';

import { logger } from '../logger';
import uniq from 'lodash/uniq';
import { RequestAction, RequestStatus } from '@transcend-io/privacy-types';
import { splitCsvToList, pullPrivacyRequests } from './requests';
import { DEFAULT_TRANSCEND_API } from '../constants';
import { writeCsv } from './cron';

/**
 * Pull down the metadata for a set of Privacy requests.
 *
 * Requires scopes:
 * - View Incoming Requests
 * - View the Request Compilation
 *
 * Dev Usage:
 * pnpm exec tsx ./src/cli-request-export.ts --auth=$TRANSCEND_API_KEY \
 *   --actions=ERASURE \
 *   --file=/Users/michaelfarrell/Desktop/test.csv
 *
 * Standard usage:
 * yarn tr-request-export --auth=$TRANSCEND_API_KEY  \
 *   --actions=ERASURE \
 *   --file=/Users/michaelfarrell/Desktop/test.csv
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    file = './transcend-request-export.csv',
    /** Transcend Backend URL */
    transcendUrl = DEFAULT_TRANSCEND_API,
    /** API key */
    auth,
    /** Sombra API key */
    sombraAuth,
    /** Request actions to export */
    actions = '',
    /** Request statuses to export */
    statuses = '',
    /** Whether or not to include test requests */
    showTests,
    /** Filter on requests created before this date */
    createdAtBefore,
    /** Filter on requests created after this date */
    createdAtAfter,
    /** Page limit when paginating */
    pageLimit = '100',
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

  // Validate actions
  const parsedActions = splitCsvToList(actions) as RequestAction[];
  const invalidActions = parsedActions.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (type) => !Object.values(RequestAction).includes(type as any),
  );
  if (invalidActions.length > 0) {
    logger.error(
      colors.red(
        `Failed to parse actions:"${invalidActions.join(',')}".\n` +
          `Expected one of: \n${Object.values(RequestAction).join('\n')}`,
      ),
    );
    process.exit(1);
  }

  // Validate statuses
  const parsedStatuses = splitCsvToList(statuses) as RequestStatus[];
  const invalidStatuses = parsedStatuses.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (type) => !Object.values(RequestStatus).includes(type as any),
  );
  if (invalidStatuses.length > 0) {
    logger.error(
      colors.red(
        `Failed to parse statuses:"${invalidStatuses.join(',')}".\n` +
          `Expected one of: \n${Object.values(RequestStatus).join('\n')}`,
      ),
    );
    process.exit(1);
  }

  // Pull privacy requests
  const { requestsFormattedForCsv } = await pullPrivacyRequests({
    transcendUrl,
    pageLimit: parseInt(pageLimit, 10),
    actions: parsedActions,
    statuses: parsedStatuses,
    auth,
    sombraAuth,
    createdAtBefore: createdAtBefore ? new Date(createdAtBefore) : undefined,
    createdAtAfter: createdAtAfter ? new Date(createdAtAfter) : undefined,
    isTest:
      showTests === 'true' ? true : showTests === 'false' ? false : undefined,
  });

  // Write to CSV
  const headers = uniq(
    requestsFormattedForCsv.map((d) => Object.keys(d)).flat(),
  );
  writeCsv(file, requestsFormattedForCsv, headers);
  logger.info(
    colors.green(
      `Successfully wrote ${requestsFormattedForCsv.length} requests to file "${file}"`,
    ),
  );
}

main();
