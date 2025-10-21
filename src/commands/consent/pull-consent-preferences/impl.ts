import type { LocalContext } from '../../../context';
import colors from 'colors';

import {
  fetchConsentPreferences,
  fetchConsentPreferencesChunked,
  transformPreferenceRecordToCsv,
  type PreferenceIdentifier,
} from '../../../lib/preference-management';
import { writeLargeCsv } from '../../../lib/cron';
import { createSombraGotInstance } from '../../../lib/graphql';
import { doneInputValidation } from '../../../lib/cli/done-input-validation';
import { logger } from '../../../logger';

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
    shouldChunk, // FIXME
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

  // Fetch preferences
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
    `Fetching consent preferences from partition ${partition}, using chunkMode=${
      shouldChunk ? 'chunked' : 'single'
    }...`,
  );

  const preferences = await (shouldChunk
    ? fetchConsentPreferencesChunked(sombra, {
        partition,
        filterBy,
        limit: concurrency,
        // FIXME
        windowConcurrency: 100, // 10 chunks in parallel
        maxChunks: 1000, // up to 1000 chunks, min 1h
      })
    : fetchConsentPreferences(sombra, {
        partition,
        filterBy,
        limit: concurrency,
      }));

  logger.info(
    colors.green(
      `Fetched ${preferences.length} consent preference records from partition ${partition}. `,
    ),
  );

  logger.info(colors.magenta(`Writing preferences to CSV file at: ${file}`));

  // Write to disk
  writeLargeCsv(file, preferences.map(transformPreferenceRecordToCsv));

  logger.info(colors.green(`Successfully wrote preferences to ${file}`));
}
