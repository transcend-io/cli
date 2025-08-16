import { PersistedState } from '@transcend-io/persisted-state';
import type { Got } from 'got';
import { keyBy } from 'lodash-es';
import * as t from 'io-ts';
import colors from 'colors';
import { type FileFormatState, type RequestUploadReceipts } from './codecs';
import { logger } from '../../logger';
import { readCsv } from '../requests';
import { getPreferencesForIdentifiers } from './getPreferencesForIdentifiers';
import { PreferenceTopic, type Identifier } from '../graphql';
import { getPreferenceUpdatesFromRow } from './getPreferenceUpdatesFromRow';
import { parsePreferenceFileFormatFromCsv } from './parsePreferenceFileFormatFromCsv';
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
 * @param schemaState - The schema state to use for parsing the file
 * @param uploadState - The upload state to use for parsing the file
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
    identifierColumns,
    columnsToIgnore,
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
    /** Identifier columns on the CSV file */
    identifierColumns: string[];
    /** Columns to ignore in the CSV file */
    columnsToIgnore: string[];
  },
  schemaState: PersistedState<typeof FileFormatState>,
  uploadState: PersistedState<typeof RequestUploadReceipts>,
): Promise<void> {
  // Start the timer
  const t0 = new Date().getTime();

  // Read in the file
  logger.info(colors.magenta(`Reading in file: "${file}"`));
  let preferences = readCsv(file, t.record(t.string, t.string));

  // TODO: Remove this COSTCO specific logic
  const updatedPreferences = await addTranscendIdToPreferences(preferences);
  preferences = updatedPreferences;

  // Validate that all timestamps are present in the file
  await parsePreferenceFileFormatFromCsv(preferences, schemaState);

  // Validate that all identifiers are present and unique
  const result = await parsePreferenceIdentifiersFromCsv(preferences, {
    schemaState,
    orgIdentifiers,
    allowedIdentifierNames,
    identifierColumns,
  });
  preferences = result.preferences;

  // Ensure all other columns are mapped to purpose and preference slug values
  await parsePreferenceAndPurposeValuesFromCsv(preferences, schemaState, {
    preferenceTopics,
    purposeSlugs,
    forceTriggerWorkflows,
    columnsToIgnore,
  });

  // Grab existing preference store records
  const currentColumnToIdentifierMap =
    schemaState.getValue('columnToIdentifier');
  const currentColumnToPurposeName = schemaState.getValue(
    'columnToPurposeName',
  );
  const identifiers = preferences.flatMap((pref) =>
    getUniquePreferenceIdentifierNamesFromRow({
      row: pref,
      columnToIdentifier: currentColumnToIdentifierMap,
    }).map((col) => ({
      name: currentColumnToIdentifierMap.name,
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
  const pendingConflictUpdates: RequestUploadReceipts['pendingConflictUpdates'] =
    {};
  const pendingSafeUpdates: RequestUploadReceipts['pendingSafeUpdates'] = {};
  const skippedUpdates: RequestUploadReceipts['skippedUpdates'] = {};

  // Process each row
  preferences.forEach((pref) => {
    // Get the userIds that could be the primary key of the consent record
    const possiblePrimaryKeys = getUniquePreferenceIdentifierNamesFromRow({
      row: pref,
      columnToIdentifier: currentColumnToIdentifierMap,
    }).map((col) => pref[col]);

    // determine updates for user
    const pendingUpdates = getPreferenceUpdatesFromRow({
      row: pref,
      columnToPurposeName: currentColumnToPurposeName,
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
      skippedUpdates[primaryKey] = pref;
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
      pendingConflictUpdates[primaryKey] = {
        row: pref,
        record: currentConsentRecord,
      };
      return;
    }

    // Add to pending updates
    pendingSafeUpdates[primaryKey] = pref;
  });

  // Read in the file
  uploadState.setValue(pendingSafeUpdates, 'pendingSafeUpdates');
  uploadState.setValue(pendingConflictUpdates, 'pendingConflictUpdates');
  uploadState.setValue(skippedUpdates, 'skippedUpdates');

  const t1 = new Date().getTime();
  logger.info(
    colors.green(
      `Successfully pre-processed file: "${file}" in ${(t1 - t0) / 1000}s`,
    ),
  );
}
