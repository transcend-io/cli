import { decodeCodec } from '@transcend-io/type-utils';
import colors from 'colors';
import type { Got } from 'got';
import { logger } from '../../logger';
import {
  DeletePreferenceRecordCliCsvRow,
  DeletePreferenceRecordsResponse,
} from './codecs';
import { readCsv } from '../requests';
import { chunk } from 'lodash-es';
import { map } from 'bluebird';
import { withPreferenceRetry } from './withPreferenceRetry';

interface FailedResult extends DeletePreferenceRecordCliCsvRow {
  /** Error message describing the failure */
  error: string;
}

interface DeletePreferenceRecordsRepositoryOptions {
  /** The partition to delete from */
  partition: string;
  /** Chunk of identifiers to delete */
  identifierChunk: DeletePreferenceRecordCliCsvRow[];
  /** the timestamp for the deletion operation */
  timestamp: Date;
}

/**
 * Options for deleting preference records
 */
type DeletePreferenceRecordsOptions = Omit<
  DeletePreferenceRecordsRepositoryOptions,
  'identifierChunk'
> & {
  /** The file path to read CSV rows from */
  filePath: string;
  /** Maximum items to include in each deletion chunk */
  maxItemsInChunk: number;
  /** Maximum concurrency for deletion requests */
  maxConcurrency: number;
};

/**
 *
 * Delete a chunk of preference records
 *
 * @param sombra - Sombra instance (must include auth headers)
 * @param options - Options for deletion
 * @param options.partition - The partition to delete from
 * @param options.identifierChunk - Chunk of identifiers to delete
 * @param options.timestamp - The timestamp for the deletion operation
 * @returns List of failed deletions
 */
async function deletePreferenceRecordsRepository(
  sombra: Got,
  {
    partition,
    identifierChunk: chunk,
    timestamp,
  }: DeletePreferenceRecordsRepositoryOptions,
): Promise<FailedResult[]> {
  try {
    const response = await withPreferenceRetry(
      'Delete Preference Records',
      () =>
        sombra
          .post(`v1/preferences/${partition}/delete`, {
            json: {
              records: chunk.map((record) => ({
                anchorIdentifier: record,
                timestamp: timestamp.toISOString(),
              })),
            },
          })
          .json(),
      {
        maxAttempts: 3,
        onRetry: (attempt, err, msg) => {
          logger.debug(
            colors.yellow(
              `Attempt ${attempt} to delete preference records failed: ${msg}`,
            ),
          );
        },
      },
    );
    const { failures } = decodeCodec(DeletePreferenceRecordsResponse, response);
    if (failures.length > 0) {
      return failures.map(({ index, error }) => ({
        ...chunk[index],
        error,
      }));
    }
    return [];
  } catch (err) {
    return chunk.map((record) => ({
      ...record,
      error: (err as Error).message,
    }));
  }
}

/**
 * Delete consent preferences for the managed consent database (delete endpoint)
 *
 * Uses POST /v1/preferences/{partition}/delete.
 *
 *
 * @param sombra - Sombra instance (must include auth headers)
 * @param options - Query options
 * @returns All nodes (only when onItems is not provided)
 */
export async function deletePreferenceRecords(
  sombra: Got,
  {
    partition,
    filePath,
    timestamp,
    maxItemsInChunk,
    maxConcurrency,
  }: DeletePreferenceRecordsOptions,
): Promise<FailedResult[]> {
  const anchorIdentifiers = readCsv(filePath, DeletePreferenceRecordCliCsvRow);
  const chunks = chunk(anchorIdentifiers, maxItemsInChunk);

  const failedResults = await map(
    chunks,
    async (identifierChunk) => {
      const failedResults = await deletePreferenceRecordsRepository(sombra, {
        partition,
        identifierChunk,
        timestamp,
      });
      return failedResults;
    },
    { concurrency: maxConcurrency },
  );
  return failedResults.flat();
}
