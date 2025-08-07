import { PersistedState } from '@transcend-io/persisted-state';
import type { Got } from 'got';
import { keyBy } from 'lodash-es';
import * as t from 'io-ts';
import colors from 'colors';
import { FileMetadataState, PreferenceState } from './codecs';
import { logger } from '../../logger';
import { readCsv } from '../requests';
import { getPreferencesForIdentifiers } from './getPreferencesForIdentifiers';
import { PreferenceTopic, type Identifier } from '../graphql';
import { getPreferenceUpdatesFromRow } from './getPreferenceUpdatesFromRow';
import { parsePreferenceTimestampsFromCsv } from './parsePreferenceTimestampsFromCsv';
import {
  addTranscendIdToPreferences,
  getUniquePreferenceIdentifierNamesFromRow,
  parsePreferenceIdentifiersFromCsv,
} from './parsePreferenceIdentifiersFromCsv';
import { parsePreferenceAndPurposeValuesFromCsv } from './parsePreferenceAndPurposeValuesFromCsv';
import { checkIfPendingPreferenceUpdatesAreNoOp } from './checkIfPendingPreferenceUpdatesAreNoOp';
import { checkIfPendingPreferenceUpdatesCauseConflict } from './checkIfPendingPreferenceUpdatesCauseConflict';

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
    sombra,
    purposeSlugs,
    preferenceTopics,
    partitionKey,
    skipExistingRecordCheck,
    forceTriggerWorkflows,
    orgIdentifiers,
    allowedIdentifierNames,
    oldReceiptFilepath,
    identifierColumns,
  }: {
    /** File to parse */
    file: string;
    /** The purpose slugs that are allowed to be updated */
    purposeSlugs: string[];
    /** The preference topics */
    preferenceTopics: PreferenceTopic[];
    /** Sombra got instance */
    sombra: Got;
    /** Partition key */
    partitionKey: string;
    /** Whether to skip the check for existing records. SHOULD ONLY BE USED FOR INITIAL UPLOAD */
    skipExistingRecordCheck: boolean;
    /** Whether to force workflow triggers */
    forceTriggerWorkflows: boolean;
    /** Identifiers configured for the org */
    orgIdentifiers: Identifier[];
    /** allowed identifiers names */
    allowedIdentifierNames: string[];
    /** Old receipt file path to restore from */
    oldReceiptFilepath?: string;
    /** Identifier columns on the CSV file */
    identifierColumns: string[];
  },
  cache: PersistedState<typeof PreferenceState>,
): Promise<void> {
  // Restore the old file metadata if it exists
  let oldFileMetadata: FileMetadataState | undefined;
  if (oldReceiptFilepath) {
    const oldPreferenceState = new PersistedState(
      oldReceiptFilepath,
      PreferenceState,
      {
        fileMetadata: {},
        failingUpdates: {},
        pendingUpdates: {},
      },
    );
    const oldGlobalMetadata = await oldPreferenceState.getValue('fileMetadata');
    const startFileKey = Object.keys(oldGlobalMetadata)[0];
    oldFileMetadata = oldGlobalMetadata[startFileKey];
  }
  // Start the timer
  const t0 = new Date().getTime();

  // Get the current metadata
  const fileMetadata = cache.getValue('fileMetadata');

  // Read in the file
  logger.info(colors.magenta(`Reading in file: "${file}"`));
  let preferences = readCsv(file, t.record(t.string, t.string));

  // TODO: Remove this COSTCO specific logic
  const updatedPreferences = await addTranscendIdToPreferences(preferences);
  preferences = updatedPreferences;
  // start building the cache, can use previous cache as well
  let currentState: FileMetadataState = {
    columnToPurposeName: oldFileMetadata?.columnToPurposeName || {},
    pendingSafeUpdates: {},
    pendingConflictUpdates: {},
    skippedUpdates: {},
    columnToIdentifier: oldFileMetadata?.columnToIdentifier || {},
    ...(oldFileMetadata?.timestampColumn && {
      timestampColumn: oldFileMetadata.timestampColumn,
    }),
    // Load in the last fetched time
    ...((fileMetadata[file] || {}) as Partial<FileMetadataState>),
    lastFetchedAt: new Date().toISOString(),
  };

  // Validate that all timestamps are present in the file
  currentState = await parsePreferenceTimestampsFromCsv(
    preferences,
    currentState,
  );
  fileMetadata[file] = currentState;
  await cache.setValue(fileMetadata, 'fileMetadata');

  // Validate that all identifiers are present and unique
  const result = await parsePreferenceIdentifiersFromCsv(
    preferences,
    currentState,
    orgIdentifiers,
    allowedIdentifierNames,
    identifierColumns,
  );
  currentState = result.currentState;
  preferences = result.preferences;
  fileMetadata[file] = currentState;
  await cache.setValue(fileMetadata, 'fileMetadata');

  // Ensure all other columns are mapped to purpose and preference
  // slug values
  currentState = await parsePreferenceAndPurposeValuesFromCsv(
    preferences,
    currentState,
    {
      preferenceTopics,
      purposeSlugs,
      forceTriggerWorkflows,
    },
  );
  fileMetadata[file] = currentState;
  await cache.setValue(fileMetadata, 'fileMetadata');

  // Grab existing preference store records
  const identifiers = preferences.flatMap((pref) =>
    getUniquePreferenceIdentifierNamesFromRow({
      row: pref,
      columnToIdentifier: currentState.columnToIdentifier,
    }).map((col) => ({
      name: currentState.columnToIdentifier[col].name,
      value: pref[col],
    })),
  );

  const existingConsentRecords = skipExistingRecordCheck
    ? []
    : await getPreferencesForIdentifiers(sombra, {
        identifiers,
        partitionKey,
      });
  const consentRecordByIdentifier = keyBy(existingConsentRecords, 'userId');

  // Clear out previous updates
  currentState.pendingConflictUpdates = {};
  currentState.pendingSafeUpdates = {};
  currentState.skippedUpdates = {};

  // Process each row
  preferences.forEach((pref) => {
    // Get the userIds that could be the primary key of the consent record
    const possiblePrimaryKeys = getUniquePreferenceIdentifierNamesFromRow({
      row: pref,
      columnToIdentifier: currentState.columnToIdentifier,
    }).map((col) => pref[col]);

    // determine updates for user
    const pendingUpdates = getPreferenceUpdatesFromRow({
      row: pref,
      columnToPurposeName: currentState.columnToPurposeName,
      preferenceTopics,
      purposeSlugs,
    });

    // Grab current state of the update
    const currentConsentRecord = possiblePrimaryKeys
      .map((primaryKey) => consentRecordByIdentifier[primaryKey])
      .find((record) => record);

    // If consent record is found use it, otherwise use the first unique identifier
    const primaryKey = currentConsentRecord?.userId || possiblePrimaryKeys[0];
    if (forceTriggerWorkflows && !currentConsentRecord) {
      throw new Error(
        `No existing consent record found for user with ids: ${possiblePrimaryKeys.join(
          ', ',
        )}.
        When 'forceTriggerWorkflows' is set all the user identifiers should contain a consent record`,
      );
    }
    // Check if the update can be skipped
    // this is the case if a record exists, and the purpose
    // and preference values are all in sync
    if (
      currentConsentRecord &&
      checkIfPendingPreferenceUpdatesAreNoOp({
        currentConsentRecord,
        pendingUpdates,
        preferenceTopics,
      }) &&
      !forceTriggerWorkflows
    ) {
      currentState.skippedUpdates[primaryKey] = pref;
      return;
    }

    // Determine if there are any conflicts
    if (
      currentConsentRecord &&
      checkIfPendingPreferenceUpdatesCauseConflict({
        currentConsentRecord,
        pendingUpdates,
        preferenceTopics,
      })
    ) {
      currentState.pendingConflictUpdates[primaryKey] = {
        row: pref,
        record: currentConsentRecord,
      };
      return;
    }

    // Add to pending updates
    currentState.pendingSafeUpdates[primaryKey] = pref;
  });

  // Read in the file
  fileMetadata[file] = currentState;
  await cache.setValue(fileMetadata, 'fileMetadata');
  const t1 = new Date().getTime();
  logger.info(
    colors.green(
      `Successfully pre-processed file: "${file}" in ${(t1 - t0) / 1000}s`,
    ),
  );
}
