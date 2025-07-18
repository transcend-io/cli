import colors from 'colors';
import type { Got } from 'got';
import * as t from 'io-ts';
import { uniq } from 'lodash-es';
import { logger } from '../../logger';
import { splitCsvToList } from '../requests/splitCsvToList';

const ADMIN_URL =
  'https://app.transcend.io/privacy-requests/incoming-requests/';
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
 * @param index - Index of request ID
 * @returns True if enriched successfully, false if skipped, throws error if failed
 */
export async function enrichPrivacyRequest(
  sombra: Got,
  { id: rawId, ...rest }: EnrichPrivacyRequest,
  enricherId: string,
  index?: number,
): Promise<boolean> {
  if (!rawId) {
    // error
    const message = `Request ID must be provided to enricher request.${
      index ? ` Found error in row: ${index}` : ''
    }`;
    logger.error(colors.red(message));
    throw new Error(message);
  }

  const id = rawId.toLowerCase();

  // Pull out the identifiers
  const enrichedIdentifiers = Object.entries(rest).reduce<
    Record<string, string[]>
  >((accumulator, [key, value]) => {
    const values = uniq(splitCsvToList(value));
    return values.length === 0
      ? accumulator
      : Object.assign(accumulator, {
          [key]: uniq(splitCsvToList(value)).map((value_) => ({
            value: key === 'email' ? value_.toLowerCase() : value_,
          })),
        });
  }, {});

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

    logger.error(
      colors.green(`Successfully enriched request: ${ADMIN_URL}${id}`),
    );
    return true;
  } catch (error) {
    // skip if already enriched
    if (
      typeof error.response.body === 'string' &&
      error.response.body.includes('Cannot update a resolved RequestEnricher')
    ) {
      logger.warn(
        colors.magenta(
          `Skipped enrichment for request: ${ADMIN_URL}${id}, request is no longer in the enriching phase.`,
        ),
      );
      return false;
    }

    // error
    logger.error(
      colors.red(
        `Failed to enricher identifiers for request with id: ${ADMIN_URL}${id} - ${error.message} - ${error.response.body}`,
      ),
    );
    throw error;
  }
}
