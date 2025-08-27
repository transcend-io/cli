import { PersistedState } from '@transcend-io/persisted-state';
import {
  FileFormatState,
  type ColumnIdentifierMap,
  type ColumnPurposeMap,
} from '../../../lib/preference-management';
import {
  retrySamePromise,
  type RetryPolicy,
} from '../../../lib/helpers/retrySamePromise';

export interface PreferenceSchemaInterface {
  /** Name of the column used as timestamp, if any */
  getTimestampColumn(): string | undefined;
  /** CSV column name -> Purpose/Preference mapping */
  getColumnToPurposeName(): ColumnPurposeMap;
  /** CSV column name -> Identifier mapping */
  getColumnToIdentifier(): ColumnIdentifierMap;
  /** The persisted cache */ // FIXME remove this
  state: PersistedState<typeof FileFormatState>;
}

/**
 * Build a schema state adapter holding CSV→purpose/identifier mappings.
 *
 * Retries creation of the underlying PersistedState with **exponential backoff**
 * when the cache file cannot be parsed due to a transient write (e.g., empty or
 * partially written file) indicated by "Unexpected end of JSON input".
 *
 * @param filepath - Path to the schema cache file
 * @returns Schema state port with strongly-named methods
 */
export async function makeSchemaState(
  filepath: string,
): Promise<PreferenceSchemaInterface> {
  // Initial state used if file does not exist or is empty.
  const initial = {
    columnToPurposeName: {},
    lastFetchedAt: new Date().toISOString(),
    columnToIdentifier: {},
  } as const;

  // Retry policy: only retry on the specific JSON truncation message.
  const policy: RetryPolicy = {
    maxAttempts: 5,
    delayMs: 50, // start small
    shouldRetry: (_status, message) =>
      typeof message === 'string' &&
      /Unexpected end of JSON input/i.test(message ?? ''),
  };

  // Exponential backoff with a reasonable cap.
  const MAX_DELAY_MS = 2_000;

  try {
    const state = await retrySamePromise(
      async () => {
        // Wrap constructor in a Promise so thrown sync errors reject properly.
        const result = await Promise.resolve(
          new PersistedState(filepath, FileFormatState, initial),
        );
        return result;
      },
      policy,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (note) => {
        // Double the delay on each backoff (cap at MAX_DELAY_MS)
        policy.delayMs = Math.min(
          MAX_DELAY_MS,
          Math.max(1, policy.delayMs * 2),
        );
        // Optional: uncomment for local diagnostics
        // process.stderr.write(`[schemaState] ${note}; next delay=${policy.delayMs}ms\n`);
      },
    );

    return {
      state,
      getTimestampColumn: (): string | undefined =>
        state.getValue('timestampColumn'),
      getColumnToPurposeName: (): ColumnPurposeMap =>
        state.getValue('columnToPurposeName'),
      getColumnToIdentifier: (): ColumnIdentifierMap =>
        state.getValue('columnToIdentifier'),
    };
  } catch (err) {
    throw new Error(
      `Failed to create schema state from ${filepath}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}
