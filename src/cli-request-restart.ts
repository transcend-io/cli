#!/usr/bin/env node

import yargs from 'yargs-parser';
import colors from 'colors';

import { logger } from './logger';
import { splitCsvToList, bulkRestartRequests } from './requests';
import { RequestAction, RequestStatus } from '@transcend-io/privacy-types';
import { DEFAULT_TRANSCEND_API } from './constants';

const ONE_MONTH = 30.5 * 24 * 60 * 60 * 1000;

/**
 * Run a command to bulk restart a set of privacy requests
 *
 * Requires an API key with follow scopes: https://app.transcend.io/infrastructure/api-keys
 *    - "Submit New Data Subject Request"
 *    - "View the Request Compilation"
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-request-restart.ts --auth=$TRANSCEND_API_KEY \
 *   --statuses=COMPILING,APPROVING --actions=ERASURE
 *
 * Standard usage:
 * yarn tr-request-restart --auth=$TRANSCEND_API_KEY \
 *   --statuses=COMPILING,APPROVING --actions=ERASURE
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    auth,
    transcendUrl = DEFAULT_TRANSCEND_API,
    sombraAuth,
    /** Restart requests matching these request actions */
    actions,
    /** Restart requests matching these request statuses */
    statuses,
    /** Concurrency to restart requests at */
    concurrency = '20',
    /** List of request IDs */
    requestIds = '',
    /** Filter for requests that were submitted before this date */
    createdAt = new Date().toISOString(),
    /** Requests that have been open for this length of time should be marked as silent mode */
    markSilent = new Date(+new Date() - ONE_MONTH * 3).toISOString(),
    /** Send an email receipt to the restarted requests */
    skipSendingReceipt = 'false',
    /** Copy over all identifiers rather than restarting the request only with the core identifier */
    copyIdentifiers = 'false',
    /** Whether to restart request with verified email or not */
    emailIsVerified = 'true',
    /** Skip the waiting period when restarting requests */
    skipWaitingPeriod = 'false',
    /** Include a receipt of the requests that were restarted in this file */
    requestReceiptFolder = './privacy-request-upload-receipts',
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

  // Parse request statuses
  if (!statuses) {
    logger.error(
      colors.red(
        'Missing required parameter "statuses". e.g. --statuses=COMPILING,APPROVING',
      ),
    );
    process.exit(1);
  }
  const requestStatuses = statuses.split(',') as RequestStatus[];
  const invalidStatuses = requestStatuses.filter(
    (status) => !Object.values(RequestStatus).includes(status),
  );
  if (invalidStatuses.length > 0) {
    logger.error(
      colors.red(
        `Received invalid status values: "${invalidStatuses.join(',')}"`,
      ),
    );
    process.exit(1);
  }

  // Upload privacy requests
  await bulkRestartRequests({
    requestReceiptFolder,
    auth,
    sombraAuth,
    requestActions,
    requestStatuses,
    requestIds: splitCsvToList(requestIds),
    createdAt: new Date(createdAt),
    emailIsVerified: emailIsVerified === 'true',
    markSilent: new Date(markSilent),
    skipSendingReceipt: skipSendingReceipt === 'true',
    copyIdentifiers: copyIdentifiers === 'true',
    skipWaitingPeriod: skipWaitingPeriod === 'true',
    concurrency: parseInt(concurrency, 10),
    transcendUrl,
  });
}

main();
