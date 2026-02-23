import { PreferenceQueryResponseItem } from '@transcend-io/privacy-types';
import type { Got } from 'got';
import colors from 'colors';
import { chunk } from 'lodash-es';
import { decodeCodec } from '@transcend-io/type-utils';
import Bluebird from 'bluebird';
import { logger } from '../../logger';
import { withPreferenceQueryRetry } from './withPreferenceQueryRetry';
import { ConsentPreferenceResponse } from './types';
import type { PreferenceUploadProgress } from '../../commands/consent/upload-preferences/upload';
import { extractErrorMessage, splitInHalf } from '../helpers';

const { map } = Bluebird;

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
    onProgress,
    logInterval = 10000,
    skipLogging = false,
    concurrency = 40,
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
    /** on progress callback */
    onProgress?: (info: PreferenceUploadProgress) => void;
  },
): Promise<PreferenceQueryResponseItem[]> {
  const results: PreferenceQueryResponseItem[] = [];
  const groupedIdentifiers = chunk(identifiers, 100);

  // create a new progress bar instance and use shades_classic theme
  const t0 = new Date().getTime();

  let total = 0;
  onProgress?.({
    successDelta: 0,
    successTotal: 0,
    fileTotal: identifiers.length, // FIXME should be record not identifier count
  });

  /**
   * Progress logger respecting `logInterval`
   *
   * @param delta - delta updated
   */
  const maybeLogProgress = (delta: number): void => {
    onProgress?.({
      successDelta: delta,
      successTotal: total,
      fileTotal: identifiers.length,
    });

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
    const rawResult = await withPreferenceQueryRetry(
      () =>
        sombra
          .post(`v1/preferences/${partitionKey}/query`, {
            json: {
              filter: { identifiers: group },
              // FIXME
              // limit: group.length,
            },
          })
          .json(),
      {
        onRetry: (attempt, _err, msg) => {
          logger.warn(
            colors.yellow(
              `[RETRY v1/preferences/${partitionKey}/query] ` +
                `group size=${group.length} partition=${partitionKey} attempt=${attempt}: ${msg}`,
            ),
          );
        },
      },
    );

    const result = decodeCodec(ConsentPreferenceResponse, rawResult);
    return result.nodes;
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
      maybeLogProgress(group.length);
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
          maybeLogProgress(1);
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
