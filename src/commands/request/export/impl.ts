import type { LocalContext } from '../../../context';
import colors from 'colors';

import { logger } from '../../../logger';
import { uniq } from 'lodash-es';
import { pullPrivacyRequests } from '../../../lib/requests';
import { writeLargeCsv } from '../../../lib/helpers';
import type { RequestAction, RequestStatus } from '@transcend-io/privacy-types';
import { doneInputValidation } from '../../../lib/cli/done-input-validation';

export interface ExportCommandFlags {
  auth: string;
  sombraAuth?: string;
  actions?: RequestAction[];
  statuses?: RequestStatus[];
  transcendUrl: string;
  file: string;
  concurrency: number;
  createdAtBefore?: Date;
  createdAtAfter?: Date;
  updatedAtBefore?: Date;
  updatedAtAfter?: Date;
  showTests?: boolean;
  skipRequestIdentifiers?: boolean;
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
    skipRequestIdentifiers,
    statuses,
    createdAtBefore,
    createdAtAfter,
    updatedAtBefore,
    updatedAtAfter,
    showTests,
  }: ExportCommandFlags,
): Promise<void> {
  doneInputValidation(this.process.exit);

  const { requestsFormattedForCsv } = await pullPrivacyRequests({
    transcendUrl,
    pageLimit,
    actions,
    skipRequestIdentifiers,
    statuses,
    auth,
    sombraAuth,
    createdAtBefore,
    createdAtAfter,
    updatedAtBefore,
    updatedAtAfter,
    isTest: showTests,
  });

  // Write to CSV
  const headers = uniq(
    requestsFormattedForCsv.map((d) => Object.keys(d)).flat(),
  );
  await writeLargeCsv(file, requestsFormattedForCsv, headers);
  logger.info(
    colors.green(
      `Successfully wrote ${requestsFormattedForCsv.length} requests to file "${file}"`,
    ),
  );
}
