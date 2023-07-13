#!/usr/bin/env node

import yargs from 'yargs-parser';
import colors from 'colors';

import { logger } from './logger';
import { RequestAction, RequestStatus } from '@transcend-io/privacy-types';
import { splitCsvToList, pullRequestsToCsv } from './requests';
import { DEFAULT_TRANSCEND_API } from './constants';

/**
 * Pull down the metadata for a set of Privacy requests.
 *
 * Requires scopes:
 * - View Incoming Requests
 * - View the Request Compilation
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-request-export.ts --auth=$TRANSCEND_API_KEY \
 *   --requestType=ERASURE \
 *   --file=/Users/michaelfarrell/Desktop/test.csv
 *
 * Standard usage:
 * yarn tr-request-export --auth=$TRANSCEND_API_KEY  \
 *   --requestType=ERASURE \
 *   --file=/Users/michaelfarrell/Desktop/test.csv
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    file = './transcend-request-export.csv',
    transcendUrl = DEFAULT_TRANSCEND_API,
    auth,
    actions = '',
    statuses = '',
    showTests,
    createdAtBefore,
    createdAtAfter,
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
    (type) => !Object.values(RequestAction).includes(type as any),
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
  await pullRequestsToCsv({
    file,
    transcendUrl,
    pageLimit: parseInt(pageLimit, 10),
    actions: parsedActions,
    statuses: parsedStatuses,
    auth,
    createdAtBefore: createdAtBefore ? new Date(createdAtBefore) : undefined,
    createdAtAfter: createdAtAfter ? new Date(createdAtAfter) : undefined,
    showTests:
      showTests === 'true' ? true : showTests === 'false' ? false : undefined,
  });
}

main();
