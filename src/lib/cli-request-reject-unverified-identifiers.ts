#!/usr/bin/env node

import yargs from 'yargs-parser';
import colors from 'colors';
import { RequestAction } from '@transcend-io/privacy-types';

import { logger } from './logger';
import { removeUnverifiedRequestIdentifiers, splitCsvToList } from './requests';
import { DEFAULT_TRANSCEND_API } from './constants';

/**
 * Clear out a set of unverified identifiers
 *
 * Requires an API key with scope:
 * - "Manage Request Compilation"
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-reject-unverified-identifiers.ts --auth=$TRANSCEND_API_KEY \
 *   --identifierNames=email,phone \
 *   --actions=ACCESS,ERASURE
 *
 * Standard usage:
 * yarn tr-reject-unverified-identifiers --auth=$TRANSCEND_API_KEY  \
 *   --identifierNames=email,phone \
 *   --actions=ACCESS,ERASURE
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    transcendUrl = DEFAULT_TRANSCEND_API,
    auth,
    identifierNames,
    actions = '',
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

  if (!identifierNames) {
    logger.error(
      colors.red(
        'Missing required parameter "identifierNames". e.g. --identifierNames=email,phone',
      ),
    );
    process.exit(1);
  }

  // Parse request actions
  const requestActions = splitCsvToList(actions) as RequestAction[];
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

  // Upload privacy requests
  await removeUnverifiedRequestIdentifiers({
    requestActions,
    transcendUrl,
    auth,
    identifierNames: splitCsvToList(identifierNames),
  });
}

main();
