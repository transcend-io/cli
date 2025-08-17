import { PersistedState } from '@transcend-io/persisted-state';
import type { Got } from 'got';
import { keyBy } from 'lodash-es';
import colors from 'colors';
import {
  type FileFormatState,
  type PendingSafePreferenceUpdates,
  type PendingWithConflictPreferenceUpdates,
  type RequestUploadReceipts,
  type SkippedPreferenceUpdates,
} from './codecs';
import { logger } from '../../logger';
import { getPreferencesForIdentifiers } from './getPreferencesForIdentifiers';
import { PreferenceTopic, type Identifier } from '../graphql';
import { getPreferenceUpdatesFromRow } from './getPreferenceUpdatesFromRow';
import { parsePreferenceFileFormatFromCsv } from './parsePreferenceFileFormatFromCsv';
import {
  getUniquePreferenceIdentifierNamesFromRow,
  parsePreferenceIdentifiersFromCsv,
} from './parsePreferenceIdentifiersFromCsv';
import { parsePreferenceAndPurposeValuesFromCsv } from './parsePreferenceAndPurposeValuesFromCsv';
import { checkIfPendingPreferenceUpdatesAreNoOp } from './checkIfPendingPreferenceUpdatesAreNoOp';
import { checkIfPendingPreferenceUpdatesCauseConflict } from './checkIfPendingPreferenceUpdatesCauseConflict';
import type { ObjByString } from '@transcend-io/type-utils';

/**
 * Parse a file into the cache
 *
 *
 * @param rawPreferences - The preferences to parse
 * @param options - Options
 * @param schemaState - The schema state to use for parsing the file
 * @returns The cache with the parsed file
 */
export async function parsePreferenceManagementCsvWithCache(
  rawPreferences: Record<string, string>[],
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
    uploadLogInterval,
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
    /** The interval to log upload progress */
    uploadLogInterval: number;
  },
  schemaState: PersistedState<typeof FileFormatState>,
): Promise<{
  /** Pending saf updates */
  pendingSafeUpdates: PendingSafePreferenceUpdates;
  /** Pending conflict updates */
  pendingConflictUpdates: PendingWithConflictPreferenceUpdates;
  /** Skipped updates */
  skippedUpdates: SkippedPreferenceUpdates;
}> {
  // Start the timer
  const t0 = new Date().getTime();

  // Validate that all timestamps are present in the file
  await parsePreferenceFileFormatFromCsv(rawPreferences, schemaState);

  // Validate that all identifiers are present and unique
  const result = await parsePreferenceIdentifiersFromCsv(rawPreferences, {
    schemaState,
    orgIdentifiers,
    allowedIdentifierNames,
    identifierColumns,
  });
  const { preferences } = result;

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
      name: currentColumnToIdentifierMap[col].name,
      value: pref[col],
    })),
  );

  const existingConsentRecords = skipExistingRecordCheck
    ? []
    : await getPreferencesForIdentifiers(sombra, {
        identifiers,
        uploadLogInterval,
        partitionKey,
      });
  const consentRecordByIdentifier = keyBy(existingConsentRecords, 'userId');

  // Clear out previous updates
  const pendingConflictUpdates: RequestUploadReceipts['pendingConflictUpdates'] =
    {};
  const pendingSafeUpdates: Record<string, Record<string, string>> = {};
  const skippedUpdates: RequestUploadReceipts['skippedUpdates'] = {};

  // Process each row
  const seenAlready: Record<string, ObjByString> = {};
  logger.log(
    colors.green(
      `Processing ${preferences.length} preferences with ${
        Object.keys(currentColumnToIdentifierMap).length
      } identifiers and ${
        Object.keys(currentColumnToPurposeName).length
      } purposes`,
    ),
  );
  preferences.forEach((pref, ind) => {
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
    let primaryKey = currentConsentRecord?.userId || possiblePrimaryKeys[0];
    // Ensure this is unique
    if (seenAlready[primaryKey]) {
      if (
        !Object.entries(pref).every(
          ([key, value]) => seenAlready[primaryKey][key] === value,
        )
      ) {
        // Show a diff of what's changed between the duplicate rows
        const previous = seenAlready[primaryKey];
        const diffs = Object.entries(pref)
          .filter(([key, value]) => previous[key] !== value)
          .map(([key]) => key)
          .join(', ');
        logger.warn(
          colors.yellow(
            `Duplicate primary key "${primaryKey}" at index ${ind}. Diff: ${diffs}`,
          ),
        );
        primaryKey = `${primaryKey}___${ind}`;
      } else {
        skippedUpdates[`${primaryKey}___${ind}`] = pref;
        logger.warn(
          colors.yellow(
            `Duplicate primary key found: "${primaryKey}" at index: "${ind}" but rows are identical.`,
          ),
        );
        return;
      }
    }
    seenAlready[primaryKey] = pref;

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
        log: false, // update this to log for debugging purposes
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

  const t1 = new Date().getTime();
  logger.info(
    colors.green(
      `Successfully pre-processed file: "${file}" in ${(t1 - t0) / 1000}s`,
    ),
  );

  return {
    pendingSafeUpdates,
    pendingConflictUpdates,
    skippedUpdates,
  };
}
