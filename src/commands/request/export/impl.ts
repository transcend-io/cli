import type { LocalContext } from '../../../context';
import colors from 'colors';

import { logger } from '../../../logger';
import { streamPrivacyRequestsToCsv } from '../../../lib/requests';
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
    concurrency,
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

  const { filePaths, totalCount } = await streamPrivacyRequestsToCsv({
    transcendUrl,
    concurrency,
    pageLimit,
    actions,
    statuses,
    auth,
    sombraAuth,
    skipRequestIdentifiers,
    createdAtBefore,
    createdAtAfter,
    updatedAtBefore,
    updatedAtAfter,
    isTest: showTests,
    file,
  });

  logger.info(
    colors.green(
      `Successfully wrote ${totalCount} requests to ` +
        `${filePaths.length} file(s): ${filePaths.join(', ')}`,
    ),
  );
}
