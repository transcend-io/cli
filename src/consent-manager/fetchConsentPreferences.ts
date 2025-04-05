import * as t from 'io-ts';
import { logger } from '../logger';
import { decodeCodec } from '@transcend-io/type-utils';
import type { Got } from 'got';
import { ConsentPreferenceFetch } from './types';

export const ConsentPreferenceResponse = t.intersection([
  t.type({
    nodes: t.array(ConsentPreferenceFetch),
  }),
  t.partial({
    lastKey: t.partial({
      userId: t.string,
      partition: t.string,
      timestamp: t.string,
    }),
  }),
]);

/** Type override */
export type ConsentPreferenceResponse = t.TypeOf<
  typeof ConsentPreferenceResponse
>;

/**
 * Fetch consent preferences for the managed consent database
 *
 * @param sombra - Sombra instance configured to make requests
 * @param options - Additional options
 * @returns The consent preferences
 */
export async function fetchConsentPreferences(
  sombra: Got,
  {
    partition,
    filterBy = {},
    pageSize = 50,
    onPage,
  }: {
    /** Partition key to fetch */
    partition: string;
    /** Filter consent preferences */
    filterBy?: {
      /** Fetch specific identifiers */
      identifiers?: string[];
      /** Filter before timestamp */
      timestampBefore?: string;
      /** Filter after timestamp */
      timestampAfter?: string;
    };
    /** Number of items to pull back at once */
    pageSize?: number;
    /** Callback to be called with each page of results */
    onPage?: (userIds: string[]) => void;
  },
): Promise<void> {
  let currentLastKey: ConsentPreferenceResponse['lastKey'];
  let shouldContinue = true;
  let totalFetched = 0;

  while (shouldContinue) {
    // eslint-disable-next-line no-await-in-loop
    const response = await sombra
      .post('v1/consent-preferences', {
        json: {
          partition,
          ...filterBy,
          // using lastKey to paginate if it exists (will not for first iteration)
          startKey: currentLastKey || undefined,
          limit: pageSize,
        },
      })
      .json();
    const { nodes, lastKey } = decodeCodec(ConsentPreferenceResponse, response);

    if (!nodes || nodes.length === 0) {
      break;
    }

    // Process the data received from the API call
    const userIds = nodes.map(({ userId }) => userId);
    if (onPage) {
      onPage(userIds);
    }
    logger.info(`Fetched ${totalFetched} consent preferences so far...`);
    totalFetched += nodes.length;
    // Extract the lastKey from the API response
    currentLastKey = lastKey;
    shouldContinue = !!lastKey && Object.keys(lastKey).length > 0;
  }
}
