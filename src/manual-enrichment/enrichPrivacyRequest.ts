import type { Got } from 'got';
import * as t from 'io-ts';
import uniq from 'lodash/uniq';
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
 * @param options - Additional options
 */
export async function enrichPrivacyRequest(
  sombra: Got,
  { id, ...rest }: EnrichPrivacyRequest,
): Promise<void> {
  const identifiers = Object.entries(rest).reduce((acc, [key, value]) => {
    const values = uniq(splitCsvToList(value));
    return values.length === 0
      ? acc
      : Object.assign(acc, {
          [key]: splitCsvToList(value),
        });
  }, {} as Record<string, string[]>);

  console.log(id, identifiers, Object.entries(rest)[0][1], typeof rest);
  // FIXME enrich request
}
