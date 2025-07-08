#!/usr/bin/env node

// TODO DELETE

import yargs from 'yargs-parser';
import colors from 'colors';

import { logger } from '../logger';
import { RequestStatus } from '@transcend-io/privacy-types';
import { splitCsvToList, downloadPrivacyRequestFiles } from './requests';
import { DEFAULT_TRANSCEND_API } from '../constants';

/**
 * Download a set of data access requests to local machine.
 *
 * Requires scopes:
 * - View Incoming Requests
 * - View the Request Compilation
 * - Request Approval and Communication (only if `approveAfterDownload` is true)
 *
 * Dev Usage:
 * pnpm exec tsx ./src/cli-request-download-files.ts --auth=$TRANSCEND_API_KEY --statuses=APPROVING
 *
 * Standard usage:
 * yarn tr-request-download-files --auth=$TRANSCEND_API_KEY --statuses=APPROVING
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    /** Transcend Backend URL */
    transcendUrl = DEFAULT_TRANSCEND_API,
    /** API key */
    auth,
    /** Download these specific request statuses */
    statuses = `${RequestStatus.Approving},${RequestStatus.Downloadable}`,
    /** Folder path to download files to */
    folderPath = './dsr-files',
    /** Concurrency to download requests at */
    concurrency = '10',
    /** Filter for requests created before this date */
    createdAtBefore,
    /** Filter for requests created after this date */
    createdAtAfter,
    /** List of request IDs to download */
    requestIds = '',
    /** Approve the requests after download */
    approveAfterDownload = 'false',
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

  // Download privacy request files
  await downloadPrivacyRequestFiles({
    transcendUrl,
    auth,
    folderPath,
    requestIds: requestIds ? splitCsvToList(requestIds) : undefined,
    statuses: parsedStatuses.length > 0 ? parsedStatuses : undefined,
    concurrency: parseInt(concurrency, 10),
    createdAtBefore: createdAtBefore ? new Date(createdAtBefore) : undefined,
    createdAtAfter: createdAtAfter ? new Date(createdAtAfter) : undefined,
    approveAfterDownload: approveAfterDownload === 'true',
  });
}

main();
