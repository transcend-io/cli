import type { LocalContext } from '../../../context';
import colors from 'colors';

import {
  fetchConsentPreferences,
  fetchConsentPreferencesChunked,
  transformPreferenceRecordToCsv,
  type PreferenceIdentifier,
} from '../../../lib/preference-management';
import {
  buildTranscendGraphQLClient,
  createSombraGotInstance,
  fetchAllIdentifiers,
  fetchAllPurposesAndPreferences,
} from '../../../lib/graphql';
import { doneInputValidation } from '../../../lib/cli/done-input-validation';
import { logger } from '../../../logger';
import { initCsvFile, appendCsvRowsOrdered } from '../../../lib/helpers';
import type { PreferenceQueryResponseItem } from '@transcend-io/privacy-types';

// Known “core” columns your transformer usually produces up front.
// Leave this list conservative; we’ll still union with transformer keys.
const CORE_COLS = [
  'userId',
  'timestamp',
  'partition',
  'decryptionStatus',
  'updatedAt',
  'usp',
  'gpp',
  'tcf',
  'airgapVersion',
];

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
  windowConcurrency: number;
  maxChunks: number;
  maxLookbackDays: number;
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
    shouldChunk,
    windowConcurrency,
    maxChunks,
    maxLookbackDays,
  }: PullConsentPreferencesCommandFlags,
): Promise<void> {
  doneInputValidation(this.process.exit);

  // Create sombra instance to communicate with
  const sombra = await createSombraGotInstance(transcendUrl, auth, sombraAuth);
  const client = buildTranscendGraphQLClient(transcendUrl, auth);

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

  // Fetch full sets (purposes+topics, identifiers) to ensure header completeness
  const [purposesWithTopics, allIdentifiers] = await Promise.all([
    fetchAllPurposesAndPreferences(client),
    fetchAllIdentifiers(client),
  ]);

  // Identifier columns: exactly the identifier names
  const identifierCols = allIdentifiers.map((i) => i.name);

  // Preference topic columns: topic names (de-duped)
  const topicCols = Array.from(
    new Set(
      purposesWithTopics.flatMap((p) => p.topics?.map((t) => t.slug) ?? []),
    ),
  ).sort((a, b) => a.localeCompare(b));

  // Some setups also want a per-purpose boolean column (e.g., “Email”, “Sms”).
  // If your transformer includes those, list them here, derived from purposes:
  const purposeCols = Array.from(
    new Set(purposesWithTopics.map((p) => p.trackingType)),
  ).sort((a, b) => a.localeCompare(b));

  // Build the complete header skeleton.
  // We’ll still union with the first transformed row’s keys to be safe.
  const completeHeadersList = [
    ...CORE_COLS,
    ...identifierCols,
    ...purposeCols,
    ...topicCols,
  ];

  // Lazily initialize CSV header order from the first transformed row.
  let headerOrder: string[] | null = null;
  let wroteHeader = false;
  const writeRows = (items: PreferenceQueryResponseItem[]): void => {
    if (!items || items.length === 0) return;
    const rows = items.map(transformPreferenceRecordToCsv);
    if (!wroteHeader) {
      const firstKeys = Object.keys(rows[0] ?? {});
      const seen = new Set<string>();
      headerOrder = [...completeHeadersList, ...firstKeys].filter((k) => {
        if (k === undefined) return false;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
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
      windowConcurrency,
      maxChunks,
      maxLookbackDays,
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
