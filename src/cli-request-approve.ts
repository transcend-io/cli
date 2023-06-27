#!/usr/bin/env node

import yargs from 'yargs-parser';
import colors from 'colors';

import { logger } from './logger';
import { RequestAction } from '@transcend-io/privacy-types';
import { splitCsvToList, approvePrivacyRequests } from './requests';

/**
 * Restart requests based on some filter criteria
 *
 * Requires scopes:
 * - Request Approval and Communication
 * - View Incoming Requests
 * - Manage Request Compilation
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-request-approve.ts --auth=asd123 \
 *   --requestType=ERASURE --silentModeBefore=06/23/2023
 *
 * Standard usage:
 * yarn tr-request-approve --auth=asd123  \
 *   --requestType=ERASURE --silentModeBefore=06/23/2023
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    transcendUrl = 'https://api.transcend.io',
    auth,
    actions = '',
    silentModeBefore,
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
  await approvePrivacyRequests({
    transcendUrl,
    requestActions: parsedActions,
    auth,
    concurrency: parseInt(concurrency, 10),
    silentModeBefore: silentModeBefore ? new Date(silentModeBefore) : undefined,
  });
}

main();