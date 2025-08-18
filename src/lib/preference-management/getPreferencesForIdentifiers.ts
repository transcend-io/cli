import { PreferenceQueryResponseItem } from '@transcend-io/privacy-types';
import type { Got } from 'got';
import colors from 'colors';
import { chunk } from 'lodash-es';
import { decodeCodec } from '@transcend-io/type-utils';
import * as t from 'io-ts';
import { map } from 'bluebird';
import { logger } from '../../logger';
import { extractErrorMessage, getErrorStatus, splitInHalf } from '../helpers';
import { RETRYABLE_BATCH_STATUSES } from '../../constants';

const PreferenceRecordsQueryResponse = t.intersection([
  t.type({
    nodes: t.array(PreferenceQueryResponseItem),
  }),
  t.partial({
    /** The base64 encoded(PreferenceStorePaginationKey) cursor for pagination */
    cursor: t.string,
  }),
]);

const MSGS = [
  'ENOTFOUND',
  'ETIMEDOUT',
  '504 Gateway Time-out',
  'Task timed out after',
];

/**
 * Grab the current consent preference values for a list of identifiers
 *
 * @param sombra - Backend to make API call to
 * @param options - Options
 * @returns Plaintext context information
 */
export async function getPreferencesForIdentifiers(
  sombra: Got,
  {
    identifiers,
    partitionKey,
    skipLogging = false,
    logInterval = 10000,
    concurrency = 30,
  }: {
    /** The list of identifiers to look up */
    identifiers: {
      /** The value of the identifier */
      value: string;
      /** The name of the identifier */
      name: string;
    }[];
    /** The partition key to look up */
    partitionKey: string;
    /** Whether to skip logging */
    skipLogging?: boolean;
    /** The interval to log upload progress */
    logInterval?: number;
    /** Concurrency for fetching identifiers */
    concurrency?: number;
  },
): Promise<PreferenceQueryResponseItem[]> {
  const results: PreferenceQueryResponseItem[] = [];
  const groupedIdentifiers = chunk(identifiers, 100);

  // create a new progress bar instance and use shades_classic theme
  const t0 = new Date().getTime();

  let total = 0;

  /** Progress logger respecting `logInterval` */
  const maybeLogProgress = (): void => {
    if (skipLogging) return;
    const shouldLog =
      total % logInterval === 0 ||
      Math.floor((total - identifiers.length) / logInterval) <
        Math.floor(total / logInterval);
    if (shouldLog) {
      logger.info(
        colors.green(
          `Fetched ${total}/${identifiers.length} user preferences from partition ${partitionKey}`,
        ),
      );
    }
  };

  /**
   * Attempt a single POST for a given group with transient retries.
   * Returns decoded nodes on success.
   * Throws an error on terminal failure.
   * If the error contains "did not pass validation", it throws that error up
   * so the caller can choose to split.
   *
   * @param group - The group of identifiers to fetch
   * @returns The decoded nodes from the response
   */
  const postGroupWithRetries = async (
    group: {
      /** Value of the identifier */
      value: string;
      /** Name of the identifier */
      name: string;
    }[],
  ): Promise<PreferenceQueryResponseItem[]> => {
    let attempts = 0;
    const maxAttempts = 3;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      attempts += 1;
      try {
        const rawResult = await sombra
          .post(`v1/preferences/${partitionKey}/query`, {
            json: {
              filter: {
                identifiers: group,
              },
              limit: group.length,
            },
          })
          .json();

        const result = decodeCodec(PreferenceRecordsQueryResponse, rawResult);
        return result.nodes;
      } catch (err) {
        const status = getErrorStatus(err);
        const msg = extractErrorMessage(err);

        // For validation failures, bubble up (caller will split)
        if (/did not pass validation/i.test(msg)) {
          throw err; // handled by caller (split path)
        }

        // If not a known transient or we've exhausted attempts → terminal error
        const isTransient =
          MSGS.some((m) => msg.includes(m)) ||
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          RETRYABLE_BATCH_STATUSES.has(status as any);
        if (!isTransient || attempts >= maxAttempts) {
          throw new Error(
            `Received an error from server after ${attempts} attempts: ${msg}`,
          );
        }

        logger.warn(
          colors.yellow(
            `[RETRYING FAILED REQUEST - Attempt ${attempts}] ` +
              `Failed to fetch ${group.length} user preferences from partition ${partitionKey}: ${msg}, status: ${status}`,
          ),
        );
      }
    }
  };

  /**
   * Recursively process a group:
   * - Try to fetch in one go.
   * - If it fails with "did not pass validation", split into halves and recurse.
   * - If the group becomes a singleton and still fails validation, skip it.
   * In all terminal paths (success or skip), increment `total` by the
   * number of identifiers accounted for and log progress.
   *
   * @param group - The group of identifiers to process
   */
  const processGroup = async (
    group: {
      /** Value of the identifier */
      value: string;
      /** Name of the identifier */
      name: string;
    }[],
  ): Promise<void> => {
    try {
      const nodes = await postGroupWithRetries(group);
      results.push(...nodes);
      total += group.length;
      maybeLogProgress();
    } catch (err) {
      const msg = extractErrorMessage(err);

      if (/did not pass validation/i.test(msg)) {
        // If single, skip and count it
        if (group.length === 1) {
          const only = group[0];
          logger.warn(
            colors.yellow(
              `Skipping identifier "${only.value}" (${only.name}): ${msg}`,
            ),
          );
          total += 1;
          maybeLogProgress();
          return;
        }

        // Otherwise, split and recurse
        const [left, right] = splitInHalf(group);
        logger.warn(
          colors.yellow(
            `Group of ${group.length} did not pass validation. Splitting into ${left.length} and ${right.length}.`,
          ),
        );
        await processGroup(left);
        await processGroup(right);
        return;
      }

      // Non-validation terminal error: rethrow
      throw err;
    }
  };

  await map(
    groupedIdentifiers,
    async (group) => {
      await processGroup(group);
    },
    { concurrency },
  );

  const t1 = new Date().getTime();
  const totalTime = t1 - t0;

  if (!skipLogging) {
    // Log completion time
    logger.info(
      colors.green(`Completed download in "${totalTime / 1000}" seconds.`),
    );
  }

  return results;
}
