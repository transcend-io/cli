import { PersistedState } from '@transcend-io/persisted-state';
import {
  RequestUploadReceipts,
  type FailingPreferenceUpdates,
  type PendingSafePreferenceUpdates,
  type PendingWithConflictPreferenceUpdates,
  type PreferenceUpdateMap,
} from '../../../../lib/preference-management';

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
 * @param filepath - Where to persist/read upload receipts
 * @returns Receipt state port with strongly-named methods
 */
export function makeReceiptsState(
  filepath: string,
): PreferenceReceiptsInterface {
  try {
    const s = new PersistedState(filepath, RequestUploadReceipts, {
      failingUpdates: {},
      pendingConflictUpdates: {},
      skippedUpdates: {},
      pendingSafeUpdates: {},
      successfulUpdates: {},
      pendingUpdates: {},
      lastFetchedAt: new Date().toISOString(),
    });

    return {
      receiptsFilepath: filepath,
      getSuccessful: () => s.getValue('successfulUpdates'),
      getPending: () => s.getValue('pendingUpdates'),
      getFailing: () => s.getValue('failingUpdates'),
      async setSuccessful(v: PreferenceUpdateMap) {
        await s.setValue(v, 'successfulUpdates');
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
