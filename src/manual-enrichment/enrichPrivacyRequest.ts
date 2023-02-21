import type { Got } from 'got';
import * as t from 'io-ts';
import { logger } from '../logger';
import uniq from 'lodash/uniq';
import colors from 'colors';
import { splitCsvToList } from '../requests/splitCsvToList';

/**
 * Minimal set required to mark as completed
 */
export const EnrichPrivacyRequest = t.record(t.string, t.string);

/** Type override */
export type EnrichPrivacyRequest = t.TypeOf<typeof EnrichPrivacyRequest>;

/**
 * Upload identifiers to a privacy request or mark request as
 *
 * @param sombra - Sombra instance configured to make requests
 * @param request - Request to enricher
 * @param enricherId - The ID of the enricher being uploaded to
 */
export async function enrichPrivacyRequest(
  sombra: Got,
  { id, ...rest }: EnrichPrivacyRequest,
  enricherId: string,
): Promise<void> {
  // Pull out the identifiers
  const enrichedIdentifiers = Object.entries(rest).reduce(
    (acc, [key, value]) => {
      const values = uniq(splitCsvToList(value));
      return values.length === 0
        ? acc
        : Object.assign(acc, {
            [key]: splitCsvToList(value).map((val) => ({ value: val })),
          });
    },
    {} as Record<string, string[]>,
  );

  // Make the GraphQL request
  try {
    await sombra
      .post('v1/enrich-identifiers', {
        headers: {
          'x-transcend-request-id': id,
          'x-transcend-enricher-id': enricherId,
        },
        json: {
          enrichedIdentifiers,
        },
      })
      .json();
  } catch (err) {
    logger.error(
      colors.red(
        `Failed to enricher identifiers for request with id: ${id} - ${err.message} - ${err.response.body}`,
      ),
    );
    throw err;
  }
}
