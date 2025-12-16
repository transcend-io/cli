import { decodeCodec } from '@transcend-io/type-utils';
import { uniq, chunk, keyBy } from 'lodash-es';
import colors from 'colors';
import type { Got } from 'got';
import { logger } from '../../logger';
import {
  DeletePreferenceRecordCliCsvRow,
  DeletePreferenceRecordsResponse,
} from './codecs';
import { readCsv } from '../requests';
import { map } from '../bluebird';
import { withPreferenceRetry } from './withPreferenceRetry';
import { getPreferencesForIdentifiers } from './getPreferencesForIdentifiers';
import type { PreferenceQueryResponseItem } from '@transcend-io/privacy-types';

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
        maxAttempts: 5,
        onRetry: (attempt, err, msg) => {
          logger.warn(
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
export async function bulkDeletePreferenceRecords(
  sombra: Got,
  {
    partition,
    filePath,
    timestamp,
    maxItemsInChunk,
    maxConcurrency,
  }: DeletePreferenceRecordsOptions,
): Promise<FailedResult[]> {
  // Determine identifiers to delete
  const anchorIdentifiers = readCsv(filePath, DeletePreferenceRecordCliCsvRow);

  // Fetch existing records
  // FIXME progress bar in this conflicts with progress bar one level higher
  const existingRecords = await getPreferencesForIdentifiers(sombra, {
    identifiers: anchorIdentifiers,
    partitionKey: partition,
  });
  const anchorNames = uniq(anchorIdentifiers.map((id) => id.name));

  logger.info(
    colors.magenta(
      `Found ${existingRecords.length} existing preference records to delete ` +
        `out of ${
          anchorIdentifiers.length
        } identifiers provided. Using anchors: ${anchorNames.join(', ')}`,
    ),
  );

  // Create a lookup of records in db
  const recordExists = anchorNames.reduce<
    Record<string, Record<string, PreferenceQueryResponseItem>>
  >((acc, anchorName) => {
    acc[anchorName] = keyBy(
      existingRecords,
      (record) =>
        record.identifiers?.find((id) => id.name === anchorName)?.value || '',
    );
    return acc;
  }, {} as Record<string, Record<string, PreferenceQueryResponseItem>>);

  // Filter identifiers to only those that exist
  const identifiersToDelete = anchorIdentifiers.filter(
    (identifier) => recordExists[identifier.name]?.[identifier.value],
  );
  if (identifiersToDelete.length !== existingRecords.length) {
    throw new Error(
      `Mismatch in existing records found (${existingRecords.length}) ` +
        `and identifiers to delete (${identifiersToDelete.length})`,
    );
  }
  const chunks = chunk(identifiersToDelete, maxItemsInChunk);

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
