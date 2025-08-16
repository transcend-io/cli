/* eslint-disable max-lines */
import {
  buildTranscendGraphQLClient,
  createSombraGotInstance,
  fetchAllPurposes,
  fetchAllPreferenceTopics,
  PreferenceTopic,
  Purpose,
  fetchAllIdentifiers,
} from '../graphql';
import colors from 'colors';
import { map } from 'bluebird';
import { chunk } from 'lodash-es';
import { logger } from '../../logger';
import { parseAttributesFromString } from '../requests';
import { PersistedState } from '@transcend-io/persisted-state';
import { parsePreferenceManagementCsvWithCache } from './parsePreferenceManagementCsv';
import { FileFormatState, RequestUploadReceipts } from './codecs';
import { PreferenceUpdateItem } from '@transcend-io/privacy-types';
import { apply, getEntries } from '@transcend-io/type-utils';
import { NONE_PREFERENCE_MAP } from './parsePreferenceFileFormatFromCsv';
import { getPreferenceUpdatesFromRow } from './getPreferenceUpdatesFromRow';
import { getPreferenceIdentifiersFromRow } from './parsePreferenceIdentifiersFromCsv';

const LOG_RATE = 1000; // FIXMe set to 10k
const CONCURRENCY = 25; // FIXME
const MAX_CHUNK_SIZE = 50; // FIXME

// Treat these as "retry in place" errors (do NOT split on these).
// Note: 329 included defensively in case of custom upstream code; primarily handle 429 & 502.
const RETRYABLE_BATCH_STATUSES = new Set([429, 502, 329] as const);

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

/**
 * Extract HTTP status code from an error thrown by got
 *
 * @param err
 */
function getStatus(err: any): number | undefined {
  return err?.response?.statusCode ?? err?.response?.status;
}

/**
 * Extract a readable error message from an error thrown by got / server
 *
 * @param err
 */
function extractErrorMessage(err: any): string {
  let errorMsg = err?.response?.body || err?.message || 'Unknown error';
  try {
    const parsed = JSON.parse(errorMsg);
    if (parsed.error) {
      // common GraphQL/REST patterns
      const msgs = parsed.errors ||
        parsed.error?.errors || [parsed.error?.message || parsed.error];
      errorMsg = (Array.isArray(msgs) ? msgs : [msgs]).join(', ');
    }
  } catch {
    // leave as-is
  }
  return errorMsg;
}

/**
 * Upload a set of consent preferences
 *
 * @param options - Options
 */
export async function uploadPreferenceManagementPreferencesInteractive({
  auth,
  sombraAuth,
  receiptFilepath,
  schemaFilePath,
  file,
  partition,
  isSilent = true,
  dryRun = false,
  skipWorkflowTriggers = false,
  skipConflictUpdates = false,
  skipExistingRecordCheck = false,
  attributes = [],
  transcendUrl,
  forceTriggerWorkflows = false,
  allowedIdentifierNames,
  identifierColumns,
  columnsToIgnore = [],
}: {
  /** The Transcend API key */
  auth: string;
  /** Sombra API key authentication */
  sombraAuth?: string;
  /** Partition key */
  partition: string;
  /** File where to store receipt and continue from where left off */
  receiptFilepath: string;
  /** Path to schema file */
  schemaFilePath: string;
  /** The file to process */
  file: string;
  /** API URL for Transcend backend */
  transcendUrl: string;
  /** Whether to do a dry run */
  dryRun?: boolean;
  /** Whether to upload as isSilent */
  isSilent?: boolean;
  /** Attributes string pre-parse. In format Key:Value */
  attributes?: string[];
  /** Skip workflow triggers */
  skipWorkflowTriggers?: boolean;
  /**
   * When true, only update preferences that do not conflict with existing
   * preferences. When false, update all preferences in CSV based on timestamp.
   */
  skipConflictUpdates?: boolean;
  /** Whether to skip the check for existing records. SHOULD ONLY BE USED FOR INITIAL UPLOAD */
  skipExistingRecordCheck?: boolean;
  /** Whether to force trigger workflows */
  forceTriggerWorkflows?: boolean;
  /** identifiers configured for the run */
  allowedIdentifierNames: string[];
  /** identifier columns on the CSV file */
  identifierColumns: string[];
  /** Columns to ignore in the CSV file */
  columnsToIgnore: string[];
}): Promise<void> {
  // Parse out the extra attributes to apply to all requests uploaded
  const parsedAttributes = parseAttributesFromString(attributes);

  // Create a new state file to store the requests from this run
  const uploadState = new PersistedState(
    receiptFilepath,
    RequestUploadReceipts,
    {
      failingUpdates: {},
      pendingConflictUpdates: {},
      skippedUpdates: {},
      pendingSafeUpdates: {},
      successfulUpdates: {},
      pendingUpdates: {},
      lastFetchedAt: new Date().toISOString(),
    },
  );
  const schemaState = new PersistedState(schemaFilePath, FileFormatState, {
    columnToPurposeName: {},
    lastFetchedAt: new Date().toISOString(),
    columnToIdentifier: {},
  });
  const failingRequests = uploadState.getValue('failingUpdates');
  const pendingRequests = uploadState.getValue('pendingUpdates');

  logger.info(
    colors.magenta(
      'Restored cache, there are: \n' +
        `${
          Object.values(failingRequests).length
        } failing requests to be retried\n` +
        `${
          Object.values(pendingRequests).length
        } pending requests to be processed\n` +
        `The following file will be processed: ${file}\n`,
    ),
  );

  // Create GraphQL client to connect to Transcend backend
  const client = buildTranscendGraphQLClient(transcendUrl, auth);

  const [sombra, purposes, preferenceTopics, identifiers] = await Promise.all([
    // Create sombra instance to communicate with
    createSombraGotInstance(transcendUrl, auth, sombraAuth),
    // get all purposes and topics
    forceTriggerWorkflows
      ? Promise.resolve([] as Purpose[])
      : fetchAllPurposes(client),
    forceTriggerWorkflows
      ? Promise.resolve([] as PreferenceTopic[])
      : fetchAllPreferenceTopics(client),
    fetchAllIdentifiers(client),
  ]);

  // Process the file
  const result = await parsePreferenceManagementCsvWithCache(
    {
      file,
      purposeSlugs: purposes.map((x) => x.trackingType),
      preferenceTopics,
      sombra,
      partitionKey: partition,
      skipExistingRecordCheck,
      forceTriggerWorkflows,
      orgIdentifiers: identifiers,
      allowedIdentifierNames,
      identifierColumns,
      columnsToIgnore,
    },
    schemaState,
  );

  // Read in the file
  uploadState.setValue(
    getEntries(result.pendingSafeUpdates).reduce(
      (acc, [userId, value], ind) => {
        if (ind < 10) {
          acc[userId] = value;
        } else {
          acc[userId] = true;
        }
        return acc;
      },
      {} as Record<string, boolean | any>,
    ),
    'pendingSafeUpdates',
  );
  uploadState.setValue(result.pendingConflictUpdates, 'pendingConflictUpdates');
  uploadState.setValue(result.skippedUpdates, 'skippedUpdates');

  // Construct the pending updates
  const pendingUpdates: Record<string, PreferenceUpdateItem> = {};
  const timestampColumn = schemaState.getValue('timestampColumn');
  const columnToPurposeName = schemaState.getValue('columnToPurposeName');
  const columnToIdentifier = schemaState.getValue('columnToIdentifier');

  logger.info(
    colors.magenta(
      `Found ${
        Object.entries(result.pendingSafeUpdates).length
      } safe updates in ${file}`,
    ),
  );
  const conflictCount = Object.entries(result.pendingConflictUpdates).length;
  if (conflictCount) {
    logger.warn(
      colors.magenta(`Found ${conflictCount} conflict updates in ${file}`),
    );
  }
  const skippedCount = Object.entries(result.skippedUpdates).length;
  if (skippedCount > 0) {
    logger.warn(
      colors.magenta(`Found ${skippedCount} skipped updates in ${file}`),
    );
  }
  // Update either safe updates only or safe + conflict
  Object.entries({
    ...result.pendingSafeUpdates,
    ...(skipConflictUpdates
      ? {}
      : apply(result.pendingConflictUpdates, ({ row }) => row)),
  }).forEach(([userId, update]) => {
    // Determine timestamp
    const timestamp =
      timestampColumn === NONE_PREFERENCE_MAP
        ? new Date()
        : new Date(update[timestampColumn!]);

    // Determine updates
    const updates = getPreferenceUpdatesFromRow({
      row: update,
      columnToPurposeName,
      preferenceTopics,
      purposeSlugs: purposes.map((x) => x.trackingType),
    });
    const identifiersForRow = getPreferenceIdentifiersFromRow({
      row: update,
      columnToIdentifier,
    });
    pendingUpdates[userId] = {
      identifiers: identifiersForRow,
      partition,
      timestamp: timestamp.toISOString(),
      purposes: Object.entries(updates).map(([purpose, value]) => ({
        ...value,
        purpose,
        workflowSettings: {
          attributes: parsedAttributes,
          isSilent,
          skipWorkflowTrigger: skipWorkflowTriggers,
        },
      })),
    };
  });
  // FIXME restart better
  await uploadState.setValue(
    Object.entries(pendingUpdates).reduce((acc, [userId, value], ind) => {
      if (ind < 10) {
        acc[userId] = value;
      } else {
        acc[userId] = true;
      }
      return acc;
    }, {} as Record<string, boolean>),
    'pendingUpdates',
  );
  await uploadState.setValue({}, 'failingUpdates');
  // await uploadState.setValue({}, 'successfulUpdates'); dont reset

  // Exist early if dry run
  if (dryRun) {
    logger.info(
      colors.green(
        `Dry run complete, exiting. ${
          Object.values(pendingUpdates).length
        } pending updates. Check file: ${receiptFilepath}`,
      ),
    );
    return;
  }

  logger.info(
    colors.magenta(
      `Uploading ${
        Object.values(pendingUpdates).length
      } preferences to partition: ${partition}`,
    ),
  );

  // Time duration
  const t0 = new Date().getTime();

  // Build a GraphQL client
  let uploadedCount = 0;
  const allUpdatesPending = Object.entries(pendingUpdates);
  const successfulUpdates = uploadState.getValue('successfulUpdates');
  const filteredUpdates = allUpdatesPending.filter(
    ([userId]) => !successfulUpdates[userId],
  );
  if (filteredUpdates.length === 0) {
    logger.warn(
      colors.yellow(
        `No pending updates to upload to partition: ${partition}, ` +
          `${allUpdatesPending.length} total already successfully uploaded.`,
      ),
    );
    await uploadState.setValue({}, 'pendingUpdates');
    await uploadState.setValue({}, 'pendingSafeUpdates');
    await uploadState.setValue({}, 'pendingConflictUpdates');
    return;
  }
  if (filteredUpdates.length < allUpdatesPending.length) {
    logger.warn(
      colors.yellow(
        `Found ${allUpdatesPending.length} total updates, but only ` +
          `${filteredUpdates.length} updates to upload to partition: ${partition}, ` +
          `as ${
            allUpdatesPending.length - filteredUpdates.length
          } were already successfully uploaded.`,
      ),
    );
  }

  // --- Helpers bound to closure state ---

  const markSuccessFor = async (
    entries: Array<[string, PreferenceUpdateItem]>,
  ) => {
    for (const [userId] of entries) {
      successfulUpdates[userId] = true;
      delete pendingUpdates[userId];
      delete result.pendingSafeUpdates[userId];
      delete result.pendingConflictUpdates[userId];
    }
    uploadedCount += entries.length;

    // Periodic persistence + logging
    if (uploadedCount % LOG_RATE === 0) {
      logger.info(
        colors.green(
          `Uploaded ${uploadedCount}/${filteredUpdates.length} user preferences to partition ${partition}`,
        ),
      );
      await uploadState.setValue(successfulUpdates, 'successfulUpdates');
      await uploadState.setValue(
        Object.entries(pendingUpdates).reduce((acc, [userId, value], ind) => {
          if (ind < 10) {
            acc[userId] = value;
          } else {
            acc[userId] = true;
          }
          return acc;
        }, {} as Record<string, any>),
        'pendingUpdates',
      );
      await uploadState.setValue(
        Object.entries(result.pendingSafeUpdates).reduce(
          (acc, [userId, value], ind) => {
            if (ind < 10) {
              acc[userId] = value;
            } else {
              acc[userId] = true;
            }
            return acc;
          },
          {} as Record<string, any>,
        ),
        'pendingSafeUpdates',
      );
      await uploadState.setValue(
        result.pendingConflictUpdates,
        'pendingConflictUpdates',
      );
    }
  };

  const markFailureForSingle = async (
    userId: string,
    update: PreferenceUpdateItem,
    err: any,
  ) => {
    let errorMsg = extractErrorMessage(err);
    if (errorMsg.includes('Too many identifiers')) {
      errorMsg += `\n     ----> ${userId.split('___')[0]}`;
    }
    logger.error(
      colors.red(
        `Failed to upload user preferences for ${userId} to partition ${partition}: ${errorMsg}`,
      ),
    );
    const failing = uploadState.getValue('failingUpdates');
    failing[userId] = {
      uploadedAt: new Date().toISOString(),
      update,
      error: errorMsg,
    };
    delete pendingUpdates[userId];
    delete result.pendingSafeUpdates[userId];
    delete result.pendingConflictUpdates[userId];
    await uploadState.setValue(failing, 'failingUpdates');
  };

  const markFailureForBatch = async (
    entries: Array<[string, PreferenceUpdateItem]>,
    err: any,
  ) => {
    for (const [userId, update] of entries) {
      await markFailureForSingle(userId, update, err);
    }
  };

  const putBatch = async (entries: Array<[string, PreferenceUpdateItem]>) =>
    sombra
      .put('v1/preferences', {
        json: {
          records: entries.map(([, update]) => update),
          skipWorkflowTriggers,
          forceTriggerWorkflows,
        },
      })
      .json();

  /**
   * Try a batch, and if it fails:
   *  - On 429/502/329: retry same batch up to 3 times with 10s sleep (no splitting).
   *  - Otherwise: split batch in half and recurse, down to single-record requests.
   *
   * @param entries
   */
  const uploadChunkWithSplit = async (
    entries: Array<[string, PreferenceUpdateItem]>,
  ): Promise<void> => {
    // Fast path: attempt the whole batch
    try {
      await putBatch(entries);
      await markSuccessFor(entries);
    } catch (err) {
      const status = getStatus(err);
      if (
        (status && RETRYABLE_BATCH_STATUSES.has(status as any)) ||
        (status === 400 && extractErrorMessage(err).includes('Slow down'))
      ) {
        // Retry this SAME batch up to 3 times with backoff 10s
        let attemptsLeft = 3;
        while (attemptsLeft > 0) {
          attemptsLeft -= 1;
          logger.warn(
            colors.yellow(
              `Received ${status} for a batch of ${
                entries.length
              }. Retrying in 10s... (${3 - attemptsLeft}/3)\n
              -> ${extractErrorMessage(err)}`,
            ),
          );
          await sleep(10_000);
          try {
            await putBatch(entries);
            await markSuccessFor(entries);
            return;
          } catch (retryErr) {
            if (
              getStatus(retryErr) &&
              RETRYABLE_BATCH_STATUSES.has(getStatus(retryErr) as any) &&
              attemptsLeft > 0
            ) {
              logger.warn(
                colors.yellow(
                  `Retry attempt failed with ${getStatus(
                    retryErr,
                  )}, retrying again...`,
                ),
              );
              continue; // loop to retry again
            }
            // If status changed to non-retryable, fall through to split behavior
            err = retryErr;
            break;
          }
        }

        // Exhausted retries (still 429/502/329): mark the WHOLE batch as failed (do NOT split)
        if (
          getStatus(err) &&
          RETRYABLE_BATCH_STATUSES.has(getStatus(err) as any)
        ) {
          logger.error(
            colors.red(
              `Exhausted retries for ${
                entries.length
              } records due to ${getStatus(
                err,
              )}. Marking entire batch as failed.`,
            ),
          );
          await markFailureForBatch(entries, err);
          return;
        }
        // Otherwise continue to split below (e.g., status changed to non-retryable).
      }

      // Non-retryable error path -> split in half recursively (down to singles)
      if (entries.length === 1) {
        // Single request: try once and mark failure if it errors
        try {
          await putBatch(entries);
          await markSuccessFor(entries);
        } catch (singleErr) {
          await markFailureForSingle(entries[0][0], entries[0][1], singleErr);
        }
        return;
      }

      const mid = Math.floor(entries.length / 2);
      const left = entries.slice(0, mid);
      const right = entries.slice(mid);
      logger.warn(
        colors.yellow(
          `Failed to upload batch of ${
            entries.length
          } records with status: ${getStatus(err)} - ${extractErrorMessage(
            err,
          )}. Splitting into two batches: ${left.length} and ${right.length}.`,
        ),
      );
      await uploadChunkWithSplit(left);
      await uploadChunkWithSplit(right);
    }
  };

  // --- Kick off uploads in chunks (top-level), but each chunk may be recursively split if needed ---
  const topLevelChunks = chunk(filteredUpdates, MAX_CHUNK_SIZE);
  await map(
    topLevelChunks,
    async (currentChunk) => {
      await uploadChunkWithSplit(currentChunk);
    },
    { concurrency: CONCURRENCY },
  );

  // Final persistence of state
  await uploadState.setValue(successfulUpdates, 'successfulUpdates');
  await uploadState.setValue({}, 'pendingUpdates');
  await uploadState.setValue({}, 'pendingSafeUpdates');
  await uploadState.setValue({}, 'pendingConflictUpdates');

  const t1 = new Date().getTime();
  const totalTime = t1 - t0;
  logger.info(
    colors.green(
      `Successfully uploaded ${
        Object.keys(successfulUpdates).length
      } user preferences to partition ${partition} in "${
        totalTime / 1000
      }" seconds!`,
    ),
  );
  if (Object.values(failingRequests).length > 0) {
    logger.error(
      colors.red(
        `There are ${
          Object.values(failingRequests).length
        } requests that failed to upload. Please check the receipt file: ${receiptFilepath}`,
      ),
    );
  }
}
