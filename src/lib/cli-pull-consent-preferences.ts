#!/usr/bin/env node

import yargs from 'yargs-parser';
import colors from 'colors';

import { logger } from '../logger';
import { DEFAULT_TRANSCEND_API } from '../constants';
import { fetchConsentPreferences } from './consent-manager';
import { writeCsv } from './cron';
import { createSombraGotInstance } from './graphql';
import { splitCsvToList } from './requests';

/**
 * Pull consent preferences from the managed consent database
 *
 * Requires following documentation found at:
 * https://docs.transcend.io/docs/consent/reference/managed-consent-database
 * https://docs.transcend.io/docs/api-reference/POST/v1/consent-preferences
 *
 * Dev Usage:
 * pnpm exec tsx ./src/cli-pull-consent-preferences.ts --auth=$TRANSCEND_API_KEY
 *
 * Standard usage:
 * yarn tr-pull-consent-preferences --auth=$TRANSCEND_API_KEY
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    /** File to save preferences to */
    file = 'preferences.csv',
    /** Sombra API key */
    sombraAuth,
    /** Transcend URL */
    transcendUrl = DEFAULT_TRANSCEND_API,
    /** API key */
    auth,
    /** Partition key */
    partition,
    /** Filter on specific identifiers */
    identifiers = '',
    /** Filter on consent preferences changed before this date */
    timestampBefore,
    /** Filter on consent preferences changed after this date */
    timestampAfter,
    /** Concurrency */
    concurrency = '100',
  } = yargs(process.argv.slice(2)) as { [k in string]: string };

  // Ensure auth is passed
  if (!auth) {
    logger.error(
      colors.red(
        'A Transcend API key must be provided. You can specify using --auth=$TRANSCEND_API_KEY',
      ),
    );
    process.exit(1);
  }

  // Ensure partition
  if (!partition) {
    logger.error(
      colors.red(
        'A partition must be provided. ' +
          'You can specify using --partition=ee1a0845-694e-4820-9d51-50c7d0a23467',
      ),
    );
    process.exit(1);
  }

  // Create sombra instance to communicate with
  const sombra = await createSombraGotInstance(transcendUrl, auth, sombraAuth);

  // Fetch preferences
  const identifiersAsList = splitCsvToList(identifiers);
  const preferences = await fetchConsentPreferences(sombra, {
    partition,
    filterBy: {
      ...(timestampBefore ? { timestampBefore } : {}),
      ...(timestampAfter ? { timestampAfter } : {}),
      ...(identifiersAsList.length > 0
        ? { identifiers: identifiersAsList }
        : {}),
    },
    limit: parseInt(concurrency, 10),
  });

  // Write to disk
  writeCsv(
    file,
    preferences.map((pref) => ({
      ...pref,
      purposes: JSON.stringify(pref.purposes),
      ...pref.purposes,
    })),
  );
}

main();
