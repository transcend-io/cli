import * as t from 'io-ts';
import { decodeCodec } from '@transcend-io/type-utils';
import type { Got } from 'got';

export const ConsentPreference = t.type({
  userId: t.string,
  partition: t.string,
  timestamp: t.string,
  purposes: t.record(t.string, t.boolean),
});

/** Type override */
export type ConsentPreference = t.TypeOf<typeof ConsentPreference>;

export const ConsentPreferenceResponse = t.intersection([
  t.type({
    nodes: t.array(ConsentPreference),
  }),
  t.partial({
    lastKey: t.partial({
      userId: t.string,
      partition: t.string,
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
    limit = 50,
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
    limit?: number;
  },
): Promise<ConsentPreference[]> {
  let currentLastKey: ConsentPreferenceResponse['lastKey'];
  const data: ConsentPreference[] = [];
  let shouldContinue = true;

  while (shouldContinue) {
    // eslint-disable-next-line no-await-in-loop
    const response = await sombra
      .post('v1/consent-preferences', {
        json: {
          partition,
          ...filterBy,
          // using lastKey to paginate if it exists (will not for first iteration)
          startKey: currentLastKey || undefined,
          limit,
        },
      })
      .json();
    const { nodes, lastKey } = decodeCodec(ConsentPreferenceResponse, response);

    if (!nodes || nodes.length === 0) {
      break;
    }

    // Process the data received from the API call
    // For example, push the new data into an array
    data.push(...nodes);

    // Extract the lastKey from the API response
    currentLastKey = lastKey;
    shouldContinue = !!lastKey && Object.keys(lastKey).length > 0;
  }

  return data;
}
