import { PersistedState } from '@transcend-io/persisted-state';
import colors from 'colors';
import groupBy from 'lodash/groupBy';
import { PreferenceState } from './codecs';
import type { Got } from 'got';
import { PreferenceQueryResponseItem } from '@transcend-io/privacy-types';
import { getPreferencesForIdentifiers } from './getPreferencesForIdentifiers';
import { logger } from '../logger';

/**
 * Get the preferences for a list of emails and update the cache
 *
 * @param options - Options
 * @param cache - The cache to store the preferences in
 * @returns The preferences for the emails
 */
export async function getPreferencesFromIdentifiersWithCache(
  {
    identifiers,
    ignoreCache = false,
    sombra,
    partitionKey,
  }: {
    /** Identifiers to fetch */
    identifiers: string[];
    /** Whether to use or ignore cache */
    ignoreCache?: boolean;
    /** Sombra got instance */
    sombra: Got;
    /** Partition key */
    partitionKey: string;
  },
  cache: PersistedState<typeof PreferenceState>,
): Promise<(PreferenceQueryResponseItem | null)[]> {
  // current cache value
  let preferenceStoreRecords = cache.getValue('preferenceStoreRecords');

  // ignore cache
  if (ignoreCache) {
    logger.info(
      colors.magenta(
        `Ignoring cache, pulling ${identifiers.length} identifiers`,
      ),
    );
    const response = await getPreferencesForIdentifiers(sombra, {
      identifiers: identifiers.map((identifier) => ({ value: identifier })),
      partitionKey,
    });
    preferenceStoreRecords = {
      ...preferenceStoreRecords,
      ...Object.fromEntries(
        identifiers.map((identifier) => [identifier, null]),
      ),
      ...Object.fromEntries(response.map((record) => [record.userId, record])),
    };
    cache.setValue(preferenceStoreRecords, 'preferenceStoreRecords');
    logger.info(
      colors.green(`Successfully pulled ${identifiers.length} identifiers`),
    );
    return response;
  }

  // group emails by whether they are in the cache
  const { missing = [], existing = [] } = groupBy(identifiers, (email) =>
    preferenceStoreRecords[email] || preferenceStoreRecords[email] === null
      ? 'existing'
      : 'missing',
  );

  logger.info(
    colors.magenta(
      `Found ${existing.length} identifiers in cache, pulling ${missing.length} identifiers`,
    ),
  );

  // fetch missing identifiers
  if (missing.length > 0) {
    const response = await getPreferencesForIdentifiers(sombra, {
      identifiers: missing.map((identifier) => ({ value: identifier })),
      partitionKey,
    });
    const newPreferenceStoreRecords = {
      ...preferenceStoreRecords,
      ...Object.fromEntries(missing.map((identifier) => [identifier, null])),
      ...Object.fromEntries(response.map((record) => [record.userId, record])),
    };
    cache.setValue(newPreferenceStoreRecords, 'preferenceStoreRecords');
    logger.info(
      colors.green(`Successfully pulled ${missing.length} identifiers`),
    );
    return identifiers.map(
      (identifier) => newPreferenceStoreRecords[identifier],
    );
  }

  logger.info(colors.green('No identifiers pulled, full cache hit'));

  // return existing identifiers
  return identifiers.map((identifier) => preferenceStoreRecords[identifier]);
}
