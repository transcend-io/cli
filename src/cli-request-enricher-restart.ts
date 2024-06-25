#!/usr/bin/env node

import yargs from 'yargs-parser';
import colors from 'colors';

import { logger } from './logger';
import { splitCsvToList, bulkRetryEnrichers } from './requests';
import {
  RequestAction,
  RequestEnricherStatus,
} from '@transcend-io/privacy-types';
import { DEFAULT_TRANSCEND_API } from './constants';

/**
 * Run a command to bulk restart a specific enricher
 *
 * Requires an API key with follow scopes: https://app.transcend.io/infrastructure/api-keys
 *    - "Submit New Data Subject Request"
 *    - "View the Request Compilation"
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-request-enricher restart.ts --auth=$TRANSCEND_API_KEY \
 *   --enricherId=03859988-66a8-4e75-bfe7-450e8c9d1bc6
 *
 * Standard usage:
 * yarn tr-request-restart --auth=$TRANSCEND_API_KEY --enricherId=03859988-66a8-4e75-bfe7-450e8c9d1bc6
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    /** Transcend Backend URL */
    transcendUrl = DEFAULT_TRANSCEND_API,
    /** API key */
    auth,
    /** Restart requests matching these request actions */
    actions,
    /** The ID of the enricher to restart */
    enricherId,
    /** Restart specified request enricher statuses */
    requestEnricherStatuses = '',
    /** Concurrency to restart requests at */
    concurrency = '15',
    /** List of request IDs */
    requestIds = '',
    /** Filter for requests created before this date */
    createdAtBefore,
    /** Filter for requests created after this date */
    createdAtAfter,
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

  // Parse request enrichers
  const requestEnricherStatusesParsed = requestEnricherStatuses.split(
    ',',
  ) as RequestEnricherStatus[];
  const invalidRequestEnricherStatusesParsed = requestActions.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (status) => !Object.values(RequestEnricherStatus).includes(status as any),
  );
  if (invalidRequestEnricherStatusesParsed.length > 0) {
    logger.error(
      colors.red(
        `Received invalid request enricher status values: "${invalidRequestEnricherStatusesParsed.join(
          ',',
        )}"`,
      ),
    );
    process.exit(1);
  }
  // Parse enricherId
  if (!enricherId) {
    logger.error(
      colors.red(
        'An enricher ID must be provided. You can specify using --enricherId=03859988-66a8-4e75-bfe7-450e8c9d1bc6',
      ),
    );
    process.exit(1);
  }

  // Upload privacy requests
  await bulkRetryEnrichers({
    auth,
    requestActions,
    enricherId,
    requestEnricherStatuses:
      requestEnricherStatusesParsed.length > 0
        ? requestEnricherStatusesParsed
        : undefined,
    requestIds: splitCsvToList(requestIds),
    createdAtBefore: createdAtBefore ? new Date(createdAtBefore) : undefined,
    createdAtAfter: createdAtAfter ? new Date(createdAtAfter) : undefined,
    concurrency: parseInt(concurrency, 10),
    transcendUrl,
  });
}

main();
