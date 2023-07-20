#!/usr/bin/env node

import yargs from 'yargs-parser';
import colors from 'colors';

import { logger } from './logger';
import { RequestAction, RequestStatus } from '@transcend-io/privacy-types';
import { splitCsvToList, cancelPrivacyRequests } from './requests';
import { DEFAULT_TRANSCEND_API } from './constants';

/**
 * Cancel requests based on some filter criteria
 *
 * Requires scopes:
 * - Request Approval and Communication
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-request-cancel.ts --auth=$TRANSCEND_API_KEY \
 *   --requestType=ERASURE --silentModeBefore=06/23/2023
 *
 * Standard usage:
 * yarn tr-request-cancel --auth=$TRANSCEND_API_KEY  \
 *   --requestType=ERASURE --silentModeBefore=06/23/2023
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    transcendUrl = DEFAULT_TRANSCEND_API,
    auth,
    actions = '',
    statuses = '',
    silentModeBefore,
    cancellationTitle,
    concurrency = '100',
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
  const invalidStatues = parsedStatuses.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (type) => !Object.values(RequestStatus).includes(type as any),
  );
  if (invalidStatues.length > 0) {
    logger.error(
      colors.red(
        `Failed to parse statuses:"${invalidStatues.join(',')}".\n` +
          `Expected one of: \n${Object.values(RequestStatus).join('\n')}`,
      ),
    );
    process.exit(1);
  }

  // Pull privacy requests
  await cancelPrivacyRequests({
    transcendUrl,
    requestActions: parsedActions,
    auth,
    cancellationTitle,
    requestIds: requestIds ? splitCsvToList(requestIds) : undefined,
    statuses: parsedStatuses.length > 0 ? parsedStatuses : undefined,
    concurrency: parseInt(concurrency, 10),
    silentModeBefore: silentModeBefore ? new Date(silentModeBefore) : undefined,
  });
}

main();
