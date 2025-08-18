import { sleepPromise } from './sleepPromise';
import { getErrorStatus } from './getErrorStatus';
import { extractErrorMessage } from './extractErrorMessage';

export interface RetryPolicy {
  /** Maximum retry attempts (not counting the initial try) */
  maxAttempts: number;
  /** Fixed delay between attempts in milliseconds */
  delayMs: number;
  /**
   * Decide whether a given error should be retried.
   *
   * @param status - HTTP status code (if known)
   * @param message - Extracted error message (if known)
   */
  shouldRetry(status?: number, message?: string): boolean;
}

/**
 * Retry a single async operation according to the provided policy.
 * The operation is executed once initially, then up to `maxAttempts` retries.
 *
 * @param op - Operation to run
 * @param policy - Retry policy
 * @param onBackoff - Observer called before each retry (for logging/metrics)
 * @returns Result of the operation if it eventually succeeds
 * @throws The last error encountered if all retries fail
 */
export async function retrySamePromise<T>(
  op: () => Promise<T>,
  policy: RetryPolicy,
  onBackoff: (note: string) => void,
): Promise<T> {
  let attempt = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      // First pass and any subsequent retries run the same op.
      return await op();
    } catch (err) {
      attempt += 1;

      // Use shared helpers for status + human-readable message extraction
      const status = getErrorStatus(err);
      const msg = extractErrorMessage(err);

      const canRetry =
        attempt <= policy.maxAttempts && policy.shouldRetry(status, msg);

      if (!canRetry) {
        // Surface the final error to the caller, which may then split/fail.
        throw err;
      }

      onBackoff(
        `Retrying after status=${status} attempt=${attempt}/${policy.maxAttempts} — ${msg}`,
      );
      await sleepPromise(policy.delayMs);
      // Loop to retry
    }
  }
}
