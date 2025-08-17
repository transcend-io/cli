import { PreferenceQueryResponseItem } from '@transcend-io/privacy-types';
import type { Got } from 'got';
import colors from 'colors';
// import cliProgress from 'cli-progress';
import { chunk } from 'lodash-es';
import { decodeCodec } from '@transcend-io/type-utils';
import * as t from 'io-ts';
import { map } from 'bluebird';
import { logger } from '../../logger';

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
      /** The name of the identifier */
      name: string;
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
  const t0 = new Date().getTime();
  // const progressBar = new cliProgress.SingleBar(
  //   {},
  //   cliProgress.Presets.shades_classic,
  // );
  // if (!skipLogging) {
  //   progressBar.start(identifiers.length, 0);
  // }

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
          // progressBar.update(total);
          // log every 1000
          // FIXME
          if (total % 1000 === 0 && !skipLogging) {
            logger.info(
              colors.green(
                `Fetched ${total}/${identifiers.length} user preferences from partition ${partitionKey}`,
              ),
            );
          }
          break; // Exit loop if successful
        } catch (err) {
          attempts += 1;
          const msg = err?.response?.body || err?.message || '';
          if (
            attempts >= maxAttempts ||
            !MSGS.some((errorMessage) => msg.includes(errorMessage))
          ) {
            throw new Error(
              `Received an error from server after ${attempts} attempts: ${msg}`,
            );
          }

          logger.warn(
            colors.yellow(
              `[RETRYING FAILED REQUEST - Attempt ${attempts}] ` +
                `Failed to fetch ${group.length} user preferences from partition ${partitionKey}: ${msg}`,
            ),
          );
        }
      }
    },
    {
      concurrency: 40,
    },
  );

  // progressBar.stop();
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
