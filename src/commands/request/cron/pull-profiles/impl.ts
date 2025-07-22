import type { RequestAction } from '@transcend-io/privacy-types';
import colors from 'colors';
import { uniq } from 'lodash-es';
import type { LocalContext } from '../../../../context';
import { map } from '../../../../lib/bluebird-replace';
import {
  parseFilePath,
  pullChunkedCustomSiloOutstandingIdentifiers,
  writeCsv,
  type CsvFormattedIdentifier,
} from '../../../../lib/cron';
import {
  buildTranscendGraphQLClient,
  fetchRequestFilesForRequest,
} from '../../../../lib/graphql';
import { logger } from '../../../../logger';

interface PullProfilesCommandFlags {
  file: string;
  fileTarget: string;
  transcendUrl: string;
  auth: string;
  sombraAuth?: string;
  cronDataSiloId: string;
  targetDataSiloId: string;
  actions: RequestAction[];
  skipRequestCount: boolean;
  pageLimit: number;
  chunkSize: number;
}

export async function pullProfiles(
  this: LocalContext,
  {
    file,
    fileTarget,
    transcendUrl,
    auth,
    sombraAuth,
    cronDataSiloId,
    targetDataSiloId,
    actions,
    skipRequestCount,
    pageLimit,
    chunkSize,
  }: PullProfilesCommandFlags,
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

  // Create GraphQL client to connect to Transcend backend
  const client = buildTranscendGraphQLClient(transcendUrl, auth);
  const { baseName, extension } = parseFilePath(file);
  const { baseName: baseNameTarget, extension: extensionTarget } =
    parseFilePath(fileTarget);

  let allIdentifiersCount = 0;
  let allTargetIdentifiersCount = 0;
  let fileCount = 0;
  // Create onSave callback to handle chunked processing
  const onSave = async (chunk: CsvFormattedIdentifier[]): Promise<void> => {
    // Add to all identifiers
    allIdentifiersCount += chunk.length;

    // Get unique request IDs from this chunk
    const requestIds = chunk.map((d) => d.requestId as string);
    const uniqueRequestIds = uniq(requestIds);

    // Pull down target identifiers for this chunk
    const results = await map(
      uniqueRequestIds,
      async (requestId) => {
        const results = await fetchRequestFilesForRequest(client, {
          requestId,
          dataSiloId: targetDataSiloId,
        });
        return results.map(({ fileName, remoteId }) => {
          if (!remoteId) {
            throw new Error(
              `Failed to find remoteId for ${fileName} request: ${requestId}`,
            );
          }
          return {
            RecordId: remoteId,
            Object: fileName
              .replace('.json', '')
              .split('/')
              .pop()
              ?.replace(' Information', ''),
            Comment:
              'Customer data deletion request submitted via transcend.io',
          };
        });
      },
      {
        concurrency: 10,
      },
    );

    allTargetIdentifiersCount += results.flat().length;

    // Write the identifiers and target identifiers to CSV
    const headers = uniq(chunk.flatMap((d) => Object.keys(d)));
    const numberedFileName = `${baseName}-${fileCount}${extension}`;
    const numberedFileNameTarget = `${baseNameTarget}-${fileCount}${extensionTarget}`;
    writeCsv(numberedFileName, chunk, headers);
    logger.info(
      colors.green(
        `Successfully wrote ${chunk.length} identifiers to file "${file}"`,
      ),
    );

    const targetIdentifiers = results.flat();
    const headers2 = uniq(targetIdentifiers.flatMap((d) => Object.keys(d)));
    writeCsv(numberedFileNameTarget, targetIdentifiers, headers2);
    logger.info(
      colors.green(
        `Successfully wrote ${targetIdentifiers.length} identifiers to file "${fileTarget}"`,
      ),
    );

    logger.info(
      colors.blue(
        `Processed chunk of ${chunk.length} identifiers, found ${targetIdentifiers.length} target identifiers`,
      ),
    );
    fileCount += 1;
  };

  // Pull down outstanding identifiers using the new chunked function
  await pullChunkedCustomSiloOutstandingIdentifiers({
    dataSiloId: cronDataSiloId,
    auth,
    sombraAuth,
    actions,
    apiPageSize: pageLimit,
    savePageSize: chunkSize,
    onSave,
    transcendUrl,
    skipRequestCount,
  });

  logger.info(
    colors.green(
      `Successfully wrote ${allIdentifiersCount} identifiers to file "${file}"`,
    ),
  );
  logger.info(
    colors.green(
      `Successfully wrote ${allTargetIdentifiersCount} identifiers to file "${fileTarget}"`,
    ),
  );
}
