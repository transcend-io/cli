import { PreferenceQueryResponseItem } from '@transcend-io/privacy-types';
import type { Got } from 'got';
import colors from 'colors';
import cliProgress from 'cli-progress';
import { chunk } from 'lodash-es';
import { decodeCodec } from '@transcend-io/type-utils';
import { map } from '../bluebird';
import { logger } from '../../logger';
import { withPreferenceRetry } from './withPreferenceRetry';
import { ConsentPreferenceResponse } from './types';

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
    concurrency = 40,
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
    /** Concurrency for requests (default 40) */
    concurrency?: number;
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
  if (!skipLogging) {
    progressBar.start(identifiers.length, 0);
  }

  let total = 0;
  await map(
    groupedIdentifiers,
    async (group) => {
      const rawResult = await withPreferenceRetry(
        'Preference Query',
        () =>
          sombra
            .post(`v1/preferences/${partitionKey}/query`, {
              json: {
                filter: { identifiers: group },
                limit: group.length,
              },
            })
            .json(),
        {
          onRetry: (attempt, _err, msg) => {
            logger.warn(
              colors.yellow(
                `[RETRY] group size=${group.length} partition=${partitionKey} attempt=${attempt}: ${msg}`,
              ),
            );
          },
        },
      );

      const result = decodeCodec(ConsentPreferenceResponse, rawResult);
      results.push(...result.nodes);
      total += group.length;
      progressBar.update(total);
    },
    {
      concurrency,
    },
  );

  progressBar.stop();
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
