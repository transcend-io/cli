import type { LocalContext } from '../../../context';
import colors from 'colors';

import {
  fetchConsentPreferences,
  fetchConsentPreferencesChunked,
  transformPreferenceRecordToCsv,
  type PreferenceIdentifier,
} from '../../../lib/preference-management';
import { createSombraGotInstance } from '../../../lib/graphql';
import { doneInputValidation } from '../../../lib/cli/done-input-validation';
import { logger } from '../../../logger';
import {
  initCsvFile,
  appendCsvRowsOrdered,
  writeLargeCsv,
} from '../../../lib/helpers';

export interface PullConsentPreferencesCommandFlags {
  auth: string;
  partition: string;
  sombraAuth?: string;
  file: string;
  transcendUrl: string;
  timestampBefore?: Date;
  timestampAfter?: Date;
  updatedBefore?: Date;
  updatedAfter?: Date;
  identifiers?: string[];
  concurrency: number;
  shouldChunk: boolean;
}

export async function pullConsentPreferences(
  this: LocalContext,
  {
    auth,
    partition,
    sombraAuth,
    file,
    transcendUrl,
    timestampBefore,
    timestampAfter,
    updatedBefore,
    updatedAfter,
    identifiers = [],
    concurrency,
    shouldChunk, // streaming path uses chunked with onItems
  }: PullConsentPreferencesCommandFlags,
): Promise<void> {
  doneInputValidation(this.process.exit);

  // Create sombra instance to communicate with
  const sombra = await createSombraGotInstance(transcendUrl, auth, sombraAuth);

  // Identifiers are key:value, parse to PreferenceIdentifier[]
  const parsedIdentifiers = identifiers.map(
    (identifier): PreferenceIdentifier => {
      if (!identifier.includes(':')) {
        return {
          name: 'email',
          value: identifier,
        };
      }
      const [name, value] = identifier.split(':');
      return { name, value };
    },
  );

  // Build filter
  const filterBy = {
    ...(timestampBefore
      ? { timestampBefore: timestampBefore.toISOString() }
      : {}),
    ...(timestampAfter ? { timestampAfter: timestampAfter.toISOString() } : {}),
    ...(updatedAfter || updatedBefore
      ? {
          system: {
            ...(updatedBefore
              ? { updatedBefore: updatedBefore.toISOString() }
              : {}),
            ...(updatedAfter
              ? { updatedAfter: updatedAfter.toISOString() }
              : {}),
          },
        }
      : {}),
    ...(parsedIdentifiers.length > 0 ? { identifiers: parsedIdentifiers } : {}),
  };

  logger.info(
    `Fetching consent preferences from partition ${partition}, using mode=${
      shouldChunk ? 'chunked-stream' : 'single'
    }...`,
  );

  logger.info(colors.magenta(`Preparing CSV at: ${file}`));

  // We will initialize headers lazily on the first page so we can derive
  // the exact column order from the transformer.
  let headerOrder: string[] | null = null;
  let wroteHeader = false;

  if (shouldChunk) {
    // Stream via chunked fetcher with page callback
    await fetchConsentPreferencesChunked(sombra, {
      partition,
      filterBy,
      limit: concurrency,
      windowConcurrency: 100,
      maxChunks: 5000,
      maxLookbackDays: 3650,
      onItems: (items) => {
        if (!items || items.length === 0) return;

        const rows = items.map(transformPreferenceRecordToCsv);

        if (!wroteHeader) {
          headerOrder = Object.keys(rows[0]);
          initCsvFile(file, headerOrder);
          wroteHeader = true;
        }

        appendCsvRowsOrdered(file, rows, headerOrder!);
      },
    });

    logger.info(colors.green(`Finished writing CSV to ${file}`));
    return;
  }

  // Non-chunked path: fetch then write in one go, but still use init+append for consistency
  const preferences = await fetchConsentPreferences(sombra, {
    partition,
    filterBy,
    limit: concurrency,
  });

  logger.info(
    colors.green(
      `Fetched ${preferences.length} consent preference records from partition ${partition}. `,
    ),
  );

  logger.info(colors.magenta(`Writing preferences to CSV file at: ${file}`));

  // Write to disk
  await writeLargeCsv(file, preferences.map(transformPreferenceRecordToCsv));

  logger.info(colors.green(`Successfully wrote preferences to ${file}`));
}
