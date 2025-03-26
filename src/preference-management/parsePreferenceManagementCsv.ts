import { PersistedState } from '@transcend-io/persisted-state';
import type { Got } from 'got';
import keyBy from 'lodash/keyBy';
import * as t from 'io-ts';
import colors from 'colors';
import { FileMetadataState, PreferenceState } from './codecs';
import { logger } from '../logger';
import { readCsv } from '../requests';
import { getPreferencesForIdentifiers } from './getPreferencesForIdentifiers';
import { PreferenceTopic } from '../graphql';
import { getPreferenceUpdatesFromRow } from './getPreferenceUpdatesFromRow';
// import { parsePreferenceTimestampsFromCsv } from './parsePreferenceTimestampsFromCsv';
// import { parsePreferenceIdentifiersFromCsv } from './parsePreferenceIdentifiersFromCsv';
// import { parsePreferenceAndPurposeValuesFromCsv } from './parsePreferenceAndPurposeValuesFromCsv';
import { checkIfPendingPreferenceUpdatesAreNoOp } from './checkIfPendingPreferenceUpdatesAreNoOp';
import { checkIfPendingPreferenceUpdatesCauseConflict } from './checkIfPendingPreferenceUpdatesCauseConflict';

const FILE_METADATA_TO_USE = {
  identifierColumn: 'IDENTIFIER',
  timestampColumn: 'TIMESTAMP',
  columnToPurposeName: {
    SalesCommunication: {
      purpose: 'SalesCommunication',
      preference: null,
      valueMapping: {
        false: false,
        true: true,
      },
    },
    MarketingCommunications: {
      purpose: 'MarketingCommunications',
      preference: null,
      valueMapping: {
        true: true,
        false: false,
      },
    },
    'SalesCommunication.SalesCommunication': {
      purpose: 'SalesCommunication',
      preference: 'SalesCommunication',
      valueMapping: {
        SalesOutreachAndSpecialOffers: 'SalesOutreachAndSpecialOffers',
      },
    },
    'MarketingCommunications.MarketingCommunications': {
      purpose: 'MarketingCommunications',
      preference: 'MarketingCommunications',
      valueMapping: {
        BBEventsAndResources: 'BBEventsAndResources',
        NewslettersAndThoughtLeadership: 'NewslettersAndThoughtLeadership',
        ProductUpdatesAndReleases: 'ProductUpdatesAndReleases',
        UserResearchAndSurveys: 'UserResearchAndSurveys',
        ProductEducationAndHowTos: 'ProductEducationAndHowToS',
      },
    },
  },
};

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
  },
  cache: PersistedState<typeof PreferenceState>,
): Promise<void> {
  // Start the timer
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
    // Load in the last fetched time
    ...((fileMetadata[file] || {}) as Partial<FileMetadataState>),
    lastFetchedAt: new Date().toISOString(),
  };

  // // Validate that all timestamps are present in the file
  // currentState = await parsePreferenceTimestampsFromCsv(
  //   preferences,
  //   currentState,
  // );
  // fileMetadata[file] = currentState;
  // await cache.setValue(fileMetadata, 'fileMetadata');

  // // Validate that all identifiers are present and unique
  // const result = await parsePreferenceIdentifiersFromCsv(
  //   preferences,
  //   currentState,
  // );
  // currentState = result.currentState;
  // preferences = result.preferences;
  // fileMetadata[file] = currentState;
  // await cache.setValue(fileMetadata, 'fileMetadata');

  // Ensure all other columns are mapped to purpose and preference
  // slug values
  // currentState = await parsePreferenceAndPurposeValuesFromCsv(
  //   preferences,
  //   currentState,
  //   {
  //     preferenceTopics,
  //     purposeSlugs,
  //   },
  // );
  currentState.columnToPurposeName = FILE_METADATA_TO_USE.columnToPurposeName;
  currentState.identifierColumn = FILE_METADATA_TO_USE.identifierColumn;
  currentState.timestampColum = FILE_METADATA_TO_USE.timestampColumn;

  fileMetadata[file] = currentState;
  await cache.setValue(fileMetadata, 'fileMetadata');

  // Grab existing preference store records
  const identifiers = preferences.map(
    (pref) => pref[currentState.identifierColumn!],
  );
  const existingConsentRecords = await getPreferencesForIdentifiers(sombra, {
    identifiers: identifiers.map((x) => ({ value: x })),
    partitionKey,
  });
  const consentRecordByIdentifier = keyBy(existingConsentRecords, 'userId');

  // Clear out previous updates
  currentState.pendingConflictUpdates = {};
  currentState.pendingSafeUpdates = {};
  currentState.skippedUpdates = {};

  // Process each row
  preferences.forEach((pref) => {
    // Grab unique Id for the user
    const userId = pref[currentState.identifierColumn!];

    // determine updates for user
    const pendingUpdates = getPreferenceUpdatesFromRow({
      row: pref,
      columnToPurposeName: currentState.columnToPurposeName,
      preferenceTopics,
      purposeSlugs,
    });

    // Grab current state of the update
    const currentConsentRecord = consentRecordByIdentifier[userId];

    // Check if the update can be skipped
    // this is the case if a record exists, and the purpose
    // and preference values are all in sync
    if (
      currentConsentRecord &&
      checkIfPendingPreferenceUpdatesAreNoOp({
        currentConsentRecord,
        pendingUpdates,
        preferenceTopics,
      })
    ) {
      currentState.skippedUpdates[userId] = pref;
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
      currentState.pendingConflictUpdates[userId] = {
        row: pref,
        record: currentConsentRecord,
      };
      return;
    }

    // Add to pending updates
    currentState.pendingSafeUpdates[userId] = pref;
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
