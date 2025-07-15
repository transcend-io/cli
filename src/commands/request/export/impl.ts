import type { LocalContext } from '../../../context';
import colors from 'colors';

import { logger } from '../../../logger';
import { uniq } from 'lodash-es';
import { pullPrivacyRequests } from '../../../lib/requests';
import { writeCsv } from '../../../lib/cron';
import type { RequestAction, RequestStatus } from '@transcend-io/privacy-types';

interface ExportCommandFlags {
  auth: string;
  sombraAuth?: string;
  actions?: RequestAction[];
  statuses?: RequestStatus[];
  transcendUrl: string;
  file: string;
  concurrency: number;
  createdAtBefore?: Date;
  createdAtAfter?: Date;
  showTests?: boolean;
  pageLimit: number;
}

// `export` is a reserved keyword, so we need to prefix it with an underscore
// eslint-disable-next-line no-underscore-dangle
export async function _export(
  this: LocalContext,
  {
    auth,
    transcendUrl,
    file,
    pageLimit,
    actions,
    sombraAuth,
    statuses,
    createdAtBefore,
    createdAtAfter,
    showTests,
  }: ExportCommandFlags,
): Promise<void> {
  const { requestsFormattedForCsv } = await pullPrivacyRequests({
    transcendUrl,
    pageLimit,
    actions,
    statuses,
    auth,
    sombraAuth,
    createdAtBefore,
    createdAtAfter,
    isTest: showTests,
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
