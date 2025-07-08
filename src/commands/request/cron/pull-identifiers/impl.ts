import type { LocalContext } from '@/context';
import colors from 'colors';

import { logger } from '@/logger';
import { uniq } from 'lodash-es';
import {
  pullCustomSiloOutstandingIdentifiers,
  writeLargeCsv,
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

  // Pull down outstanding identifiers
  const { identifiersFormattedForCsv } =
    await pullCustomSiloOutstandingIdentifiers({
      transcendUrl,
      pageLimit,
      actions,
      auth,
      sombraAuth,
      dataSiloId,
      skipRequestCount,
    });

  // Write CSV (split into multiple files if too large)
  const headers = uniq(
    identifiersFormattedForCsv.map((d) => Object.keys(d)).flat(),
  );
  const writtenFiles = await writeLargeCsv(
    file,
    identifiersFormattedForCsv,
    headers,
    chunkSize,
  );

  if (writtenFiles.length === 1) {
    logger.info(
      colors.green(
        `Successfully wrote ${identifiersFormattedForCsv.length} identifiers to file "${file}"`,
      ),
    );
  } else {
    logger.info(
      colors.green(
        `Successfully wrote ${identifiersFormattedForCsv.length} identifiers to ${writtenFiles.length} files:`,
      ),
    );
    writtenFiles.forEach((fileName) => {
      logger.info(colors.green(`  - ${fileName}`));
    });
  }
}
