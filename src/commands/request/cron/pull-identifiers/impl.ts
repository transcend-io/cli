import type { LocalContext } from '@/context';
import colors from 'colors';

import { logger } from '@/logger';
import { uniq } from 'lodash-es';
import {
  CsvFormattedIdentifier,
  parseFilePath,
  pullChunkedCustomSiloOutstandingIdentifiers,
  writeCsv,
} from '@/lib/cron';
import { RequestAction } from '@transcend-io/privacy-types';

interface PullIdentifiersCommandFlags {
  file: string;
  transcendUrl: string;
  auth: string;
  sombraAuth?: string;
  dataSiloId: string;
  actions: RequestAction[];
  pageLimit: number;
  skipRequestCount: boolean;
  chunkSize: number;
}

export async function pullIdentifiers(
  this: LocalContext,
  {
    file,
    transcendUrl,
    auth,
    sombraAuth,
    dataSiloId,
    actions,
    pageLimit,
    skipRequestCount,
    chunkSize,
  }: PullIdentifiersCommandFlags,
): Promise<void> {
  if (skipRequestCount) {
    logger.info(
      colors.yellow(
        'Skipping request count as requested. This may help speed up the call.',
      ),
    );
  }

  if (
    Number.isNaN(chunkSize) ||
    chunkSize <= 0 ||
    chunkSize % pageLimit !== 0
  ) {
    logger.error(
      colors.red(
        `Invalid chunk size: "${chunkSize}". Must be a positive integer that is a multiple of ${pageLimit}.`,
      ),
    );
    process.exit(1);
  }

  const { baseName, extension } = parseFilePath(file);
  let fileCount = 0;

  const onSave = (chunk: CsvFormattedIdentifier[]): Promise<void> => {
    const numberedFileName = `${baseName}-${fileCount}${extension}`;
    logger.info(
      colors.blue(
        `Saving ${chunk.length} identifiers to file "${numberedFileName}"`,
      ),
    );

    const headers = uniq(chunk.map((d) => Object.keys(d)).flat());
    writeCsv(numberedFileName, chunk, headers);
    logger.info(
      colors.green(
        `Successfully wrote ${chunk.length} identifiers to file "${numberedFileName}"`,
      ),
    );
    fileCount += 1;
    return Promise.resolve();
  };

  // Pull down outstanding identifiers
  await pullChunkedCustomSiloOutstandingIdentifiers({
    transcendUrl,
    apiPageSize: pageLimit,
    savePageSize: chunkSize,
    onSave,
    actions,
    auth,
    sombraAuth,
    dataSiloId,
    skipRequestCount,
  });
}
