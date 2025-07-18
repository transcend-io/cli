import { PreferenceQueryResponseItem } from '@transcend-io/privacy-types';
import { decodeCodec } from '@transcend-io/type-utils';
import cliProgress from 'cli-progress';
import colors from 'colors';
import type { Got } from 'got';
import * as t from 'io-ts';
import { chunk } from 'lodash-es';
import { logger } from '../../logger';
import { map } from '../bluebird-replace';

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
  }: {
    /** The list of identifiers to look up */
    identifiers: {
      /** The value of the identifier */
      value: string;
    }[];
    /** The partition key to look up */
    partitionKey: string;
    /** Whether to skip logging */
    skipLogging?: boolean;
  },
): Promise<PreferenceQueryResponseItem[]> {
  const results: PreferenceQueryResponseItem[] = [];
  const groupedIdentifiers = chunk(identifiers, 100);

  // create a new progress bar instance and use shades_classic theme
  const t0 = Date.now();
  const progressBar = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic,
  );
  if (!skipLogging) {
    progressBar.start(identifiers.length, 0);
  }

  let total = 0;
  await map(
    groupedIdentifiers,
    async (group) => {
      // Make the request with retry logic
      let attempts = 0;
      const maxAttempts = 3;
      while (attempts < maxAttempts) {
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
          results.push(...result.nodes);
          total += group.length;
          progressBar.update(total);
          break; // Exit loop if successful
        } catch (error) {
          attempts += 1;
          const message = error?.response?.body || error?.message || '';
          if (
            attempts >= maxAttempts ||
            !MSGS.some((errorMessage) => message.includes(errorMessage))
          ) {
            throw new Error(
              `Received an error from server after ${attempts} attempts: ${message}`,
            );
          }

          logger.warn(
            colors.yellow(
              `[RETRYING FAILED REQUEST - Attempt ${attempts}] ` +
                `Failed to fetch ${group.length} user preferences from partition ${partitionKey}: ${message}`,
            ),
          );
        }
      }
    },
    {
      concurrency: 40,
    },
  );

  progressBar.stop();
  const t1 = Date.now();
  const totalTime = t1 - t0;

  if (!skipLogging) {
    // Log completion time
    logger.info(
      colors.green(`Completed download in "${totalTime / 1000}" seconds.`),
    );
  }

  return results;
}
