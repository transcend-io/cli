#!/usr/bin/env node

import yargs from 'yargs-parser';
import colors from 'colors';

import { logger } from '../logger';
import { RequestAction } from '@transcend-io/privacy-types';
import {
  splitCsvToList,
  notifyPrivacyRequestsAdditionalTime,
} from './requests';
import { DEFAULT_TRANSCEND_API } from '../constants';

/**
 * Notify requests that more time is needed
 *
 * Requires scopes:
 * - Request Approval and Communication
 * - View Incoming Requests
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-request-notify-additional-time.ts --auth=$TRANSCEND_API_KEY \
 *   --actions=ERASURE --createdAtBefore=01/01/2024
 *
 * Standard usage:
 * yarn tr-request-notify-additional-time --auth=$TRANSCEND_API_KEY  \
 *   --actions=ERASURE --createdAtBefore=01/01/2024
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    /** Transcend Backend URL */
    transcendUrl = DEFAULT_TRANSCEND_API,
    /** API key */
    auth,
    /** Cancel these specific actions */
    actions = '',
    /** Concurrency to notify requests at */
    concurrency = '50',
    /** Number of days to extend by */
    days = '45',
    /**
     * Only notify requests that have less than this number of days until they are considered expired.
     * This allows for re-running the command without notifying the same users multiple times
     */
    daysLeft = '10',
    /** Filter for requests created before this date */
    createdAtBefore,
    /** Email template title to sue when notifying requests */
    emailTemplate = 'Additional Time Needed',
    /** Filter for requests created after this date */
    createdAtAfter,
    /** List of request IDs */
    requestIds = '',
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

  if (!createdAtBefore) {
    logger.error(
      colors.red(
        'createdAtBefore must be provided. You can specify using --createdAtBefore=01/01/2024',
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

  // Pull privacy requests
  await notifyPrivacyRequestsAdditionalTime({
    transcendUrl,
    requestActions: parsedActions,
    auth,
    emailTemplate,
    days: parseInt(days, 10),
    daysLeft: parseInt(daysLeft, 10),
    requestIds: requestIds ? splitCsvToList(requestIds) : undefined,
    concurrency: parseInt(concurrency, 10),
    createdAtBefore: new Date(createdAtBefore),
    createdAtAfter: createdAtAfter ? new Date(createdAtAfter) : undefined,
  });
}

main();
