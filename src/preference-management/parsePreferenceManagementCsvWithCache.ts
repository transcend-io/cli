import { PersistedState } from '@transcend-io/persisted-state';
import difference from 'lodash/difference';
import type { Got } from 'got';
import groupBy from 'lodash/groupBy';
import uniq from 'lodash/uniq';
import keyBy from 'lodash/keyBy';
import inquirer from 'inquirer';
import * as t from 'io-ts';
import colors from 'colors';
import { FileMetadataState, PreferenceState } from './codecs';
import { logger } from '../logger';
import { readCsv } from '../requests';
import { getPreferencesFromEmailsWithCache } from './getPreferencesFromEmailsWithCache';

const NONE = '[NONE]';

/**
 * Parse a file into the cache
 *
 *
 * @param options - Options
 * @param cache - The cache to store the parsed file in
 * @returns The cache with the parsed file
 */
export async function parsePreferenceManagementCsvWithCache(
  {
    file,
    ignoreCache,
    sombra,
    partitionKey,
  }: {
    /** File to parse */
    file: string;
    /** Whether to use or ignore cache */
    ignoreCache?: boolean;
    /** Sombra got instance */
    sombra: Got;
    /** Partition key */
    partitionKey: string;
  },
  cache: PersistedState<typeof PreferenceState>,
): Promise<void> {
  const t0 = new Date().getTime();

  // Get the current metadata
  const fileMetadata = cache.getValue('fileMetadata');

  // Read in the file
  logger.info(colors.magenta(`Reading in file: "${file}"`));
  const preferences = readCsv(file, t.record(t.string, t.string));

  // start building the cache, can use previous cache as well
  const currentState: FileMetadataState = {
    columnToPurposeName: {},
    pendingSafeUpdates: {},
    pendingConflictUpdates: {},
    skippedUpdates: {},
    successfulUpdates: {},
    // Load in the last fetched time
    ...((fileMetadata[file] || {}) as Partial<FileMetadataState>),
    lastFetchedAt: new Date().toISOString(),
  };

  // Determine columns to map
  const columnNames = uniq(preferences.map((x) => Object.keys(x)).flat());

  // Determine the identifier column to work off of
  if (!currentState.identifierColumn) {
    const { identifierName } = await inquirer.prompt<{
      /** Identifier name */
      identifierName: string;
    }>([
      {
        name: 'identifierName',
        message:
          'Choose the column that will be used as the identifier to upload consent preferences by',
        type: 'list',
        default:
          columnNames.find((col) => col.toLowerCase().includes('email')) ||
          columnNames[0],
        choices: columnNames,
      },
    ]);
    currentState.identifierColumn = identifierName;
    fileMetadata[file] = currentState;
    cache.setValue(fileMetadata, 'fileMetadata');
  }
  logger.info(
    colors.magenta(
      `Using identifier column "${currentState.identifierColumn}" in file: "${file}"`,
    ),
  );

  // Validate that the identifier column is present for all rows and unique
  const identifierColumnsMissing = preferences
    .map((pref, ind) => (pref[currentState.identifierColumn!] ? null : [ind]))
    .filter((x): x is number[] => !!x)
    .flat();
  if (identifierColumnsMissing.length > 0) {
    throw new Error(
      `The identifier column "${
        currentState.identifierColumn
      }" is missing a value for the following rows: ${identifierColumnsMissing.join(
        ', ',
      )} in file "${file}"`,
    );
  }
  logger.info(
    colors.magenta(
      `The identifier column "${currentState.identifierColumn}" is present for all rows in file: "${file}"`,
    ),
  );

  // Validate that all identifiers are unique
  const rowsByUserId = groupBy(preferences, currentState.identifierColumn);
  const duplicateIdentifiers = Object.entries(rowsByUserId).filter(
    ([, rows]) => rows.length > 1,
  );
  if (duplicateIdentifiers.length > 0) {
    throw new Error(
      `The identifier column "${
        currentState.identifierColumn
      }" has duplicate values for the following rows: ${duplicateIdentifiers
        .map(([userId, rows]) => `${userId} (${rows.length})`)
        .join(', ')} in file "${file}"`,
    );
  }

  // Determine the identifier column to work off of
  const remainingColumns = difference(columnNames, [
    currentState.identifierColumn,
  ]);
  if (!currentState.timestampColum) {
    const { timestampName } = await inquirer.prompt<{
      /** timestamp name */
      timestampName: string;
    }>([
      {
        name: 'timestampName',
        message:
          'Choose the column that will be used as the timestamp of last preference update',
        type: 'list',
        default:
          remainingColumns.find((col) => col.toLowerCase().includes('date')) ||
          remainingColumns.find((col) => col.toLowerCase().includes('time')) ||
          remainingColumns[0],
        choices: [...remainingColumns, NONE],
      },
    ]);
    currentState.timestampColum = timestampName;
    fileMetadata[file] = currentState;
    cache.setValue(fileMetadata, 'fileMetadata');
  }
  logger.info(
    colors.magenta(
      `Using timestamp column "${currentState.timestampColum}" in file: "${file}"`,
    ),
  );

  // Ensure all rows are accounted for
  const otherColumns = difference(columnNames, [
    currentState.identifierColumn,
    currentState.timestampColum,
  ]);
  // FIXME
  if (otherColumns.length > 0) {
    logger.error(colors.red(`Other columns: ${otherColumns.join(', ')}`));
  }

  // Grab existing preference store records
  const emails = preferences.map(
    (pref) => pref[currentState.identifierColumn!],
  );
  const existingConsentRecords = await getPreferencesFromEmailsWithCache(
    {
      emails,
      ignoreCache,
      sombra,
      partitionKey,
    },
    cache,
  );
  const consentRecordByEmail = keyBy(existingConsentRecords, 'userId');

  // Process each row
  preferences.forEach((pref) => {
    // used to compare if the preference has already been processed
    const stringifiedPref = JSON.stringify(pref);

    // Grab current state of the update
    const previousSuccesses =
      currentState.successfulUpdates[pref[currentState.identifierColumn!]] ||
      [];
    const currentConsentRecord =
      consentRecordByEmail[pref[currentState.identifierColumn!]];
    const pendingConflictUpdate =
      currentState.pendingConflictUpdates[pref[currentState.identifierColumn!]];
    const pendingSafeUpdate =
      currentState.pendingSafeUpdates[pref[currentState.identifierColumn!]];
    const skippedUpdate =
      currentState.skippedUpdates[pref[currentState.identifierColumn!]];

    // Check if change was already processed
    // no need to do anything here as there is already an audit record for this event
    if (previousSuccesses.find((x) => JSON.stringify(x) === stringifiedPref)) {
      return;
    }

    console.log({
      pendingConflictUpdate,
      pendingSafeUpdate,
      skippedUpdate,
      currentConsentRecord,
    });
  });

  // Read in the file
  fileMetadata[file] = currentState;
  cache.setValue(fileMetadata, 'fileMetadata');
  const t1 = new Date().getTime();
  logger.info(
    colors.green(
      `Successfully pre-processed file: "${file}" in ${(t1 - t0) / 1000}s`,
    ),
  );
}
