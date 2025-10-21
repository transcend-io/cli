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
import { initCsvFile, appendCsvRowsOrdered } from '../../../lib/helpers';
import type { PreferenceQueryResponseItem } from '@transcend-io/privacy-types';

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
      shouldChunk ? 'chunked-stream' : 'paged-stream'
    }...`,
  );

  logger.info(colors.magenta(`Preparing CSV at: ${file}`));

  // Lazily initialize CSV header order from the first transformed row.
  let headerOrder: string[] | null = null;
  let wroteHeader = false;
  const writeRows = (items: PreferenceQueryResponseItem[]): void => {
    if (!items || items.length === 0) return;
    const rows = items.map(transformPreferenceRecordToCsv);
    if (!wroteHeader) {
      headerOrder = Object.keys(rows[0]);
      initCsvFile(file, headerOrder);
      wroteHeader = true;
    }
    appendCsvRowsOrdered(file, rows, headerOrder!);
  };

  if (shouldChunk) {
    // Stream via chunked fetcher with page callback
    await fetchConsentPreferencesChunked(sombra, {
      partition,
      filterBy,
      limit: concurrency,
      // FIXME
      windowConcurrency: 100,
      maxChunks: 5000,
      maxLookbackDays: 3650,
      onItems: (items) => writeRows(items),
    });

    logger.info(colors.green(`Finished writing CSV to ${file}`));
    return;
  }

  // Non-chunked path: still stream page-by-page via onItems (no in-memory accumulation)
  await fetchConsentPreferences(sombra, {
    partition,
    filterBy,
    limit: concurrency, // page size (API max 50 enforced internally)
    onItems: (items) => writeRows(items),
  });

  logger.info(colors.green(`Finished writing CSV to ${file}`));
}
