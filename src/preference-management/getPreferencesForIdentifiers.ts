import { PreferenceQueryResponseItem } from '@transcend-io/privacy-types';
import type { Got } from 'got';
import colors from 'colors';
import cliProgress from 'cli-progress';
import chunk from 'lodash/chunk';
import { decodeCodec } from '@transcend-io/type-utils';
import * as t from 'io-ts';
import { map } from 'bluebird';
import { logger } from '../logger';

const PreferenceRecordsQueryResponse = t.intersection([
  t.type({
    nodes: t.array(PreferenceQueryResponseItem),
  }),
  t.partial({
    /** The base64 encoded(PreferenceStorePaginationKey) cursor for pagination */
    cursor: t.string,
  }),
]);

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
  }: {
    /** The list of identifiers to look up */
    identifiers: {
      /** The value of the identifier */
      value: string;
    }[];
    /** The partition key to look up */
    partitionKey: string;
  },
): Promise<PreferenceQueryResponseItem[]> {
  const results: PreferenceQueryResponseItem[] = [];
  const groupedIdentifiers = chunk(identifiers, 100);

  // create a new progress bar instance and use shades_classic theme
  const t0 = new Date().getTime();
  const progressBar = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic,
  );
  progressBar.start(identifiers.length, 0);

  let total = 0;
  await map(
    groupedIdentifiers,
    async (group) => {
      // Make the request
      try {
        const rawResult = await sombra
          .post(`v1/preferences/${partitionKey}/query`, {
            json: {
              filter: {
                identifiers: group,
              },
            },
          })
          .json();

        const result = decodeCodec(PreferenceRecordsQueryResponse, rawResult);
        results.push(...result.nodes);
        total += group.length;
        progressBar.update(total);
      } catch (err) {
        try {
          const parsed = JSON.parse(err?.response?.body || '{}');
          if (parsed.error) {
            logger.error(colors.red(`Error: ${parsed.error}`));
          }
        } catch (e) {
          // continue
        }
        const msg = err?.response?.body || err?.message || '';
        if (!msg.includes('ETIMEDOUT')) {
          throw new Error(
            `Received an error from server: ${
              err?.response?.body || err?.message
            }`,
          );
        }
        const rawResult = await sombra
          .post(`v1/preferences/${partitionKey}/query`, {
            json: {
              filter: {
                identifiers: group,
              },
            },
          })
          .json();

        const result = decodeCodec(PreferenceRecordsQueryResponse, rawResult);
        results.push(...result.nodes);
        total += group.length;
        progressBar.update(total);
      }
    },
    {
      concurrency: 10,
    },
  );

  progressBar.stop();
  const t1 = new Date().getTime();
  const totalTime = t1 - t0;

  // Log completion time
  logger.info(
    colors.green(`Completed upload in "${totalTime / 1000}" seconds.`),
  );

  return results;
}
