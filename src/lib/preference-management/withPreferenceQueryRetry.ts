import colors from 'colors';
import { logger } from '../../logger';
import { sleepPromise } from '../helpers';

/**
 * Transient network / platform errors that merit a retry.
 * Keep this list short and specific to avoid masking real failures.
 */
export const RETRY_PREFERENCE_MSGS: string[] = [
  'ENOTFOUND',
  'ECONNRESET',
  'ETIMEDOUT',
  '502 Bad Gateway',
  '504 Gateway Time-out',
  'Task timed out after',
  'unknown request error',
].map((s) => s.toLowerCase());

/**
 * Options for retrying preference queries.
 */
export type RetryOptions = {
  /** Max attempts including the first try (default 3) */
  maxAttempts?: number;
  /** Initial backoff in ms (default 250) */
  baseDelayMs?: number;
  /** Optional custom predicate to decide if an error is retryable */
  isRetryable?: (err: unknown, message: string) => boolean;
  /** Optional hook to log on each retry */
  onRetry?: (attempt: number, err: unknown, message: string) => void;
};

/**
 * Run an async function with standardized retry behavior for preference queries.
 * Exponential backoff with jitter; only retries on known-transient messages.
 *
 * @param fn - Function to run
 * @param options - Retry options
 * @returns Result of the function
 */
export async function withPreferenceQueryRetry<T>(
  fn: () => Promise<T>,
  {
    maxAttempts = 3,
    baseDelayMs = 250,
    isRetryable = (_err, msg) =>
      RETRY_PREFERENCE_MSGS.some((m) => msg.toLowerCase().includes(m)),
    onRetry,
  }: RetryOptions = {},
): Promise<T> {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    attempt += 1;
    try {
      return await fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const msg: string =
        (err && (err.response?.body || err.message)) ??
        String(err ?? 'Unknown error');
      const willRetry = attempt < maxAttempts && isRetryable(err, msg);
      if (!willRetry) {
        throw new Error(
          `Preference query failed after ${attempt} attempt(s): ${msg}`,
        );
      }
      onRetry?.(attempt, err, msg);

      const backoff = baseDelayMs * 2 ** (attempt - 1);
      const jitter = Math.floor(Math.random() * baseDelayMs);
      const delay = backoff + jitter;
      logger.warn(
        colors.yellow(
          `[retry] attempt ${attempt}/${
            maxAttempts - 1
          }; backing off ${delay}ms: ${msg}`,
        ),
      );
      await sleepPromise(delay);
    }
  }
}
