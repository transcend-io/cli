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
export async function getPreferencesFromEmailsWithCache(
  {
    emails,
    ignoreCache = false,
    sombra,
    partitionKey,
  }: {
    /** Emails to fetch */
    emails: string[];
    /** Whether to use or ignore cache */
    ignoreCache?: boolean;
    /** Sombra got instance */
    sombra: Got;
    /** Partition key */
    partitionKey: string;
  },
  cache: PersistedState<typeof PreferenceState>,
): Promise<PreferenceQueryResponseItem[]> {
  // current cache value
  let preferenceStoreRecords = cache.getValue('preferenceStoreRecords');

  // ignore cache
  if (ignoreCache) {
    logger.info(
      colors.magenta(`Ignoring cache, pulling ${emails.length} emails`),
    );
    const response = await getPreferencesForIdentifiers(sombra, {
      identifiers: emails.map((email) => ({ value: email })),
      partitionKey,
    });
    preferenceStoreRecords = {
      ...preferenceStoreRecords,
      ...Object.fromEntries(response.map((record) => [record.userId, record])),
    };
    cache.setValue(preferenceStoreRecords, 'preferenceStoreRecords');
    logger.info(colors.green(`Successfully pulled ${emails.length} emails`));
    return response;
  }

  // group emails by whether they are in the cache
  const { missing = [], existing = [] } = groupBy(emails, (email) =>
    preferenceStoreRecords[email] ? 'existing' : 'missing',
  );

  logger.info(
    colors.magenta(
      `Found ${existing.length} emails in cache, pulling ${missing.length} emails`,
    ),
  );

  // fetch missing emails
  if (missing.length > 0) {
    const response = await getPreferencesForIdentifiers(sombra, {
      identifiers: missing.map((email) => ({ value: email })),
      partitionKey,
    });
    const newPreferenceStoreRecords = {
      ...preferenceStoreRecords,
      ...Object.fromEntries(response.map((record) => [record.userId, record])),
    };
    cache.setValue(newPreferenceStoreRecords, 'preferenceStoreRecords');
    logger.info(colors.green(`Successfully pulled ${missing.length} emails`));
    return existing.map((email) => newPreferenceStoreRecords[email]);
  }

  logger.info(colors.green('No emails pulled, full cache hit'));

  // return existing emails
  return existing.map((email) => preferenceStoreRecords[email]);
}
