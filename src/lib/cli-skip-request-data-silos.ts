#!/usr/bin/env node

import yargs from 'yargs-parser';
import colors from 'colors';

import { logger } from '../logger';
import { skipRequestDataSilos, splitCsvToList } from './requests';
import { DEFAULT_TRANSCEND_API } from '../constants';
import { RequestStatus } from '@transcend-io/privacy-types';

/**
 * Given a data silo ID, skip all active privacy requests that are open for that data silo
 *
 * Requires an API key with scope:
 * - "Manage Request Compilation"
 *
 * Dev Usage:
 * pnpm exec tsx ./src/cli-skip-request-data-silos.ts --auth=$TRANSCEND_API_KEY \
 *   --dataSiloId=92636cda-b7c6-48c6-b1b1-2df574596cbc
 *
 * Standard usage:
 * yarn tr-skip-request-data-silos --auth=$TRANSCEND_API_KEY  \
 *   --dataSiloId=92636cda-b7c6-48c6-b1b1-2df574596cbc
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    /** Transcend Backend URL */
    transcendUrl = DEFAULT_TRANSCEND_API,
    /** API key */
    auth,
    /** Data silo ID to mark requests fpr */
    dataSiloId,
    /** Mark request data silos with requests matching these request statuses */
    statuses = `${RequestStatus.Compiling},${RequestStatus.Secondary}`,
    /** The status to set */
    status = 'SKIPPED',
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

  // Ensure dataSiloId is provided
  if (!dataSiloId) {
    logger.error(
      colors.red(
        'A Data Silo ID must be provided. You can specify using --dataSiloId=2560bb81-b837-4c6f-a57e-dcef87069d43',
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

  // Upload privacy requests
  await skipRequestDataSilos({
    transcendUrl,
    auth,
    status: status as 'SKIPPED' | 'RESOLVED',
    dataSiloId,
    requestStatuses: parsedStatuses,
  });
}
main();
