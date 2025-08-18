import { PersistedState } from '@transcend-io/persisted-state';
import {
  RequestUploadReceipts,
  type FailingPreferenceUpdates,
  type PendingSafePreferenceUpdates,
  type PendingWithConflictPreferenceUpdates,
  type PreferenceUpdateMap,
  type SkippedPreferenceUpdates,
} from '../../../../../lib/preference-management';
import {
  retrySamePromise,
  type RetryPolicy,
} from '../../../../../lib/helpers/retrySamePromise';

export type PreferenceReceiptsInterface = {
  /** Path to file */
  receiptsFilepath: string;
  /**
   * Get the successfully updated records
   */
  getSuccessful(): PreferenceUpdateMap;
  /**
   * Get the records pending upload
   */
  getPending(): PreferenceUpdateMap;
  /**
   * Get the failing to upload records
   */
  getFailing(): FailingPreferenceUpdates;
  /**
   * Set the new map of successful records
   */
  setSuccessful(next: PreferenceUpdateMap): Promise<void>;
  /**
   * Set the new map of pending records
   */
  setPending(next: PreferenceUpdateMap): Promise<void>;
  /**
   * Set the new map of safe to upload records
   */
  setPendingSafe(next: PendingSafePreferenceUpdates): Promise<void>;
  /**
   * Set the skipped records
   */
  setSkipped(next: PendingSafePreferenceUpdates): Promise<void>;
  /**
   * Set the new map of conflict upload records
   */
  setPendingConflict(next: PendingWithConflictPreferenceUpdates): Promise<void>;
  /**
   * Set the new map of failing records
   */
  setFailing(next: FailingPreferenceUpdates): Promise<void>;
  /**
   * Reset the pending records
   */
  resetPending(): Promise<void>;
};

/**
 * Build a receipts state adapter for the given file path.
 *
 * Retries creation of the underlying PersistedState with **exponential backoff**
 * when the receipts file cannot be parsed due to a transient write (e.g., empty
 * or partially written file) indicated by "Unexpected end of JSON input".
 *
 * @param filepath - Where to persist/read upload receipts
 * @returns Receipt state port with strongly-named methods
 */
export async function makeReceiptsState(
  filepath: string,
): Promise<PreferenceReceiptsInterface> {
  // Initial shape if file does not exist or is empty.
  const initial = {
    failingUpdates: {},
    pendingConflictUpdates: {},
    skippedUpdates: {},
    pendingSafeUpdates: {},
    successfulUpdates: {},
    pendingUpdates: {},
    lastFetchedAt: new Date().toISOString(),
  } as const;

  // Retry policy: only retry on the specific JSON truncation message.
  const policy: RetryPolicy = {
    maxAttempts: 10,
    delayMs: 500, // start small and backoff
    shouldRetry: (_status, message) =>
      typeof message === 'string' &&
      /Unexpected end of JSON input/i.test(message ?? ''),
  };

  // Exponential backoff cap to avoid unbounded waits.
  const MAX_DELAY_MS = 2_000;

  try {
    const s = await retrySamePromise(
      async () => {
        // Wrap constructor in a Promise so thrown sync errors reject properly.
        const result = await Promise.resolve(
          new PersistedState(filepath, RequestUploadReceipts, initial),
        );
        return result;
      },
      policy,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (_note) => {
        // Double the delay on each backoff (cap at MAX_DELAY_MS)
        policy.delayMs = Math.min(
          MAX_DELAY_MS,
          Math.max(1, policy.delayMs * 2),
        );
        // Optional local diagnostics:
        // process.stderr.write(`[receiptsState] ${_note}; next delay=${policy.delayMs}ms\n`);
      },
    );

    return {
      receiptsFilepath: filepath,
      getSuccessful: () => s.getValue('successfulUpdates'),
      getPending: () => s.getValue('pendingUpdates'),
      getFailing: () => s.getValue('failingUpdates'),
      async setSuccessful(v: PreferenceUpdateMap) {
        await s.setValue(v, 'successfulUpdates');
      },
      async setSkipped(v: SkippedPreferenceUpdates) {
        await s.setValue(v, 'skippedUpdates');
      },
      async setPending(v: PreferenceUpdateMap) {
        await s.setValue(v, 'pendingUpdates');
      },
      async setPendingSafe(v: PendingSafePreferenceUpdates) {
        await s.setValue(v, 'pendingSafeUpdates');
      },
      async setPendingConflict(v: PendingWithConflictPreferenceUpdates) {
        await s.setValue(v, 'pendingConflictUpdates');
      },
      async setFailing(v: FailingPreferenceUpdates) {
        await s.setValue(v, 'failingUpdates');
      },
      async resetPending() {
        await s.setValue({}, 'pendingUpdates');
        await s.setValue({}, 'pendingSafeUpdates');
        await s.setValue({}, 'skippedUpdates');
        await s.setValue({}, 'pendingConflictUpdates');
      },
    };
  } catch (error) {
    throw new Error(
      `Failed to create receipts state for ${filepath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
