/* eslint-disable no-param-reassign */
import colors from 'colors';
import Bluebird from 'bluebird';
import { chunk, groupBy } from 'lodash-es';
import { logger } from '../../../../logger';
import { buildPendingUpdates } from './transform';
import { uploadChunkWithSplit } from './batchUploader';
import type { PreferenceUpdateItem } from '@transcend-io/privacy-types';
import { RETRYABLE_BATCH_STATUSES } from '../../../../constants';
import { extractErrorMessage, limitRecords } from '../../../../lib/helpers';
import type { InteractiveUploadPreferencePlan } from './buildInteractiveUploadPlan';
import type { PreferenceReceiptsInterface } from '../artifacts/receipts';
import type { Got } from 'got';
import type { PreferenceUploadProgress } from './types';

const { map: pMap } = Bluebird;

/**
 * Execute the upload using a pre-built InteractiveUploadPlan.
 *
 * This function performs *no CSV parsing or validation*. It:
 *  - Converts pre-validated safe/conflict sets into PreferenceUpdateItem payloads
 *  - Batches + uploads with retry/split semantics
 *  - Writes progress snapshots to receipts
 *
 * @param plan - Output of `buildInteractiveUploadPlan`
 * @param options - Upload-only options (batch size, concurrency, etc.)
 */
export async function interactivePreferenceUploaderFromPlan(
  {
    partition,
    parsedAttributes,
    references: { purposes, preferenceTopics },
    result: { pendingSafeUpdates, pendingConflictUpdates },
    schema,
  }: InteractiveUploadPreferencePlan,
  {
    receipts,
    sombra,
    dryRun = false,
    isSilent = true,
    skipWorkflowTriggers = false,
    skipConflictUpdates = false,
    forceTriggerWorkflows = false,
    uploadLogInterval = 1_000,
    maxChunkSize = 25,
    uploadConcurrency = 20,
    maxRecordsToReceipt = 50,
    onProgress,
  }: {
    /** Receipts interface */
    receipts: PreferenceReceiptsInterface;
    /** Sombra got instance */
    sombra: Got;
    /** Compute-only mode: do not PUT; still writes receipts snapshots */
    dryRun?: boolean;
    /** Avoid downstream visible notifications */
    isSilent?: boolean;
    /** Skip workflow triggers for each update */
    skipWorkflowTriggers?: boolean;
    /** Only upload safe updates (ignore conflicts entirely) */
    skipConflictUpdates?: boolean;
    /** Force triggering workflows for each update (use sparingly) */
    forceTriggerWorkflows?: boolean;
    /** Log/persist cadence for progress updates */
    uploadLogInterval?: number;
    /** Max records in a single batch PUT to v1/preferences */
    maxChunkSize?: number;
    /** Max concurrent batch tasks at once */
    uploadConcurrency?: number;
    /** Maximum records to write out to the receipt file */
    maxRecordsToReceipt?: number;
    /** on progress callback */
    onProgress?: (info: PreferenceUploadProgress) => void;
  },
): Promise<void> {
  // Build final payloads (pure transform; no network)
  const pendingUpdates: Record<string, PreferenceUpdateItem> =
    buildPendingUpdates({
      safe: pendingSafeUpdates,
      conflicts: pendingConflictUpdates,
      skipConflictUpdates,
      timestampColumn: schema.timestampColumn,
      columnToPurposeName: schema.columnToPurposeName,
      columnToIdentifier: schema.columnToIdentifier,
      columnToMetadata: schema.columnToMetadata,
      preferenceTopics,
      purposes,
      partition,
      workflowAttrs: parsedAttributes,
      isSilent,
      skipWorkflowTriggers,
      forceTriggerWorkflows,
    });

  // Seed pending uploads into receipts (first 10 expanded to keep file size small)
  await receipts.setPending(limitRecords(pendingUpdates, maxRecordsToReceipt));

  // Dry-run exits before any network calls
  if (dryRun) {
    logger.info(
      colors.green(
        `Dry run complete — ${
          Object.values(pendingUpdates).length
        } pending updates. ` +
          `See receipts file: ${receipts.receiptsFilepath}`,
      ),
    );
    return;
  }

  logger.info(
    colors.magenta(
      `Uploading ${
        Object.values(pendingUpdates).length
      } preferences to partition: ${partition}. Concurrency: ${uploadConcurrency}, Max Chunk Size: ${maxChunkSize}` +
        `, Max Records to Receipt: ${maxRecordsToReceipt}`,
    ),
  );

  const t0 = Date.now();
  let uploadedCount = 0;

  // reset failing
  await receipts.setFailing({});

  // Get successful and filtered entries
  const successful = receipts.getSuccessful();
  const allEntries = Object.entries(pendingUpdates) as Array<
    [string, PreferenceUpdateItem]
  >;
  const filtered = allEntries.filter(([userId]) => !successful[userId]);
  const fileTotal = filtered.length;

  onProgress?.({
    successDelta: 0,
    successTotal: 0,
    fileTotal,
  });

  if (filtered.length === 0) {
    logger.warn(
      colors.yellow(
        `No pending updates to upload (all ${allEntries.length} are already marked successful).`,
      ),
    );
    await receipts.resetPending();
    return;
  }

  if (filtered.length < allEntries.length) {
    logger.warn(
      colors.yellow(
        `Filtered ${
          allEntries.length - filtered.length
        } already-successful updates. ` +
          `${filtered.length} remain to upload.`,
      ),
    );
  }

  // Retry policy for "retry in place" statuses
  const retryPolicy = {
    maxAttempts: 5,
    delayMs: 10_000,
    shouldRetry: (status?: number) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      !!status && RETRYABLE_BATCH_STATUSES.has(status as any),
  };

  /**
   * Mark a batch as successfully uploaded. Persists progress periodically based on
   * `uploadLogInterval` to throttle IO and keep receipts compact.
   *
   * @param entries - Entries to mark as successful
   */
  const markSuccessFor = async (
    entries: Array<[string, PreferenceUpdateItem]>,
  ): Promise<void> => {
    const successfulUpdates = receipts.getSuccessful();

    for (const [userId] of entries) {
      successfulUpdates[userId] = true;
      delete pendingUpdates[userId];
      // Also keep the safe/conflict mirrors in sync in case of resume
      delete pendingSafeUpdates[userId];
      delete pendingConflictUpdates[userId];
    }
    uploadedCount += entries.length;
    onProgress?.({
      successDelta: entries.length,
      successTotal: uploadedCount,
      fileTotal,
    });

    const shouldLog =
      uploadedCount % uploadLogInterval === 0 ||
      Math.floor((uploadedCount - entries.length) / uploadLogInterval) <
        Math.floor(uploadedCount / uploadLogInterval);

    if (shouldLog) {
      logger.info(
        colors.green(
          `Uploaded ${uploadedCount}/${filtered.length} user preferences to partition ${partition}`,
        ),
      );
      await receipts.setSuccessful(successfulUpdates);

      await receipts.setPending(
        limitRecords(pendingUpdates, maxRecordsToReceipt),
      );
      await receipts.setPendingSafe(
        limitRecords(pendingSafeUpdates, maxRecordsToReceipt),
      );
      await receipts.setPendingConflict(pendingConflictUpdates);
    }
  };

  /**
   * Mark a single record failure with a concise, actionable error message.
   * Mirrors are kept in sync to avoid reprocessing this row on resume.
   *
   * @param userId - User ID to mark as failed
   * @param update - The update item that failed
   * @param err - The error that occurred
   */
  const markFailureForSingle = async (
    userId: string,
    update: PreferenceUpdateItem,
    err: unknown,
  ): Promise<void> => {
    const msg = extractErrorMessage(err);
    logger.error(
      colors.red(
        `Failed to upload preferences for ${userId} (partition=${partition}): ${msg}`,
      ),
    );
    const failing = receipts.getFailing();
    failing[userId] = {
      uploadedAt: new Date().toISOString(),
      update,
      error: msg.includes('Identifier email did not pass validation')
        ? 'Identifier email did not pass validation'
        : msg,
    };

    delete pendingUpdates[userId];
    delete pendingSafeUpdates[userId];
    delete pendingConflictUpdates[userId];

    await receipts.setFailing(failing);
  };

  /**
   * Mark an entire batch as failed (used when we exhaust in-place retries for
   * retryable statuses). Delegates to the single-failure handler per entry.
   *
   * @param entries - Entries to mark as failed
   * @param err - The error that occurred
   */
  const markFailureForBatch = async (
    entries: Array<[string, PreferenceUpdateItem]>,
    err: unknown,
  ): Promise<void> => {
    for (const [userId, update] of entries) {
      await markFailureForSingle(userId, update, err);
    }
  };

  const {
    valid = [],
    invalidAt = [],
    invalidSlash = [],
  } = groupBy(filtered, ([, update]) =>
    !update.identifiers
      ? 'valid'
      : update.identifiers.some(
          (id) => id.name === 'email' && !id.value.includes('@'),
        )
      ? 'invalidAt'
      : update.identifiers.some(
          (id) => id.name === 'email' && id.value.includes('/'),
        )
      ? 'invalidSlash'
      : 'valid',
  );

  if (invalidAt.length > 0) {
    await markFailureForBatch(
      invalidAt,
      new Error('Invalid email format - missing @'),
    );
  }
  if (invalidSlash.length > 0) {
    await markFailureForBatch(
      invalidSlash,
      new Error('Invalid email format - email contains a slash (/)'),
    );
  }

  if (valid.length === 0) {
    logger.warn(colors.yellow('No updates to upload after validating emails.'));
    await receipts.resetPending();
    return;
  }

  // Kick off uploads in chunks; each chunk may be recursively split on errors
  const chunks = chunk(valid, maxChunkSize);
  await pMap(
    chunks,
    async (currentChunk) => {
      await uploadChunkWithSplit(
        currentChunk,
        {
          // Minimal transport surface for the uploader
          putBatch: async (updates, opts) => {
            await sombra
              .put('v1/preferences', {
                json: {
                  records: updates,
                  skipWorkflowTriggers: opts.skipWorkflowTriggers,
                },
              })
              .json();
          },
          retryPolicy,
          options: { skipWorkflowTriggers },
          isRetryableStatus: (s) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            !!s && RETRYABLE_BATCH_STATUSES.has(s as any),
        },
        {
          onSuccess: markSuccessFor,
          onFailureSingle: ([userId, update], err) =>
            markFailureForSingle(userId, update, err),
          onFailureBatch: markFailureForBatch,
        },
      );
    },
    { concurrency: uploadConcurrency },
  );

  // Finalize receipts: persist success map and clear pending mirrors
  await receipts.setSuccessful(receipts.getSuccessful());
  await receipts.resetPending();

  const elapsedSec = (Date.now() - t0) / 1000;
  logger.info(
    colors.green(
      `Successfully uploaded ${
        Object.keys(receipts.getSuccessful()).length
      } user preferences ` +
        `to partition ${partition} in "${elapsedSec}" seconds!`,
    ),
  );

  const remainingFailures = Object.values(receipts.getFailing()).length;
  if (remainingFailures > 0) {
    logger.error(
      colors.red(
        `There are ${remainingFailures} requests that failed to upload. ` +
          `Please check the receipts file for details: ${receipts.receiptsFilepath}`,
      ),
    );
  }
}
/* eslint-enable no-param-reassign */
