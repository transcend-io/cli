/* eslint-disable max-lines */
import { PersistedState } from '@transcend-io/persisted-state';
import difference from 'lodash/difference';
import type { Got } from 'got';
import groupBy from 'lodash/groupBy';
import uniq from 'lodash/uniq';
import keyBy from 'lodash/keyBy';
import inquirer from 'inquirer';
import * as t from 'io-ts';
import colors from 'colors';
import {
  FileMetadataState,
  PreferenceState,
  PurposeRowMapping,
} from './codecs';
import { logger } from '../logger';
import { readCsv } from '../requests';
import { getPreferencesForIdentifiers } from './getPreferencesForIdentifiers';
import { Purpose, PreferenceTopic } from '../graphql';
import { mapSeries } from 'bluebird';
import { inquirerConfirmBoolean } from '../helpers';
import { PreferenceStorePurposeResponse } from '@transcend-io/privacy-types';
import { apply } from '@transcend-io/type-utils';

export const NONE_PREFERENCE_MAP = '[NONE]';

/**
 * Parse a row into its purposes and preferences
 *
 * @param options - Options
 * @returns The parsed row
 */
export function getUpdatesFromPreferenceRow({
  row,
  columnToPurposeName,
}: {
  /** Row to parse */
  row: Record<string, string>;
  /** Column names to parse */
  columnToPurposeName: Record<string, PurposeRowMapping>;
}): {
  [k in string]: Omit<PreferenceStorePurposeResponse, 'purpose'>;
} {
  const result: {
    [k in string]: Partial<PreferenceStorePurposeResponse>;
  } = {};

  Object.keys(columnToPurposeName).forEach((col) => {
    const mappings = columnToPurposeName[col];
    const [purpose, preference] = mappings.purpose.split('->');

    if (preference) {
      if (!result[purpose]) {
        result[purpose] = {
          preferences: [],
        };
      }
      result[purpose].preferences!.push({
        topic: preference,
        choice: {
          // FIXME select and multi select
          booleanValue: mappings.valueMapping[row[col]] === true,
        },
      });
    } else if (!result[purpose]) {
      result[purpose] = {
        enabled: mappings.valueMapping[row[col]] === true,
      };
    } else {
      result[purpose].enabled = mappings.valueMapping[row[col]] === true;
    }
  });

  return apply(result, (x) => ({
    ...x,
    enabled: x.enabled!,
  }));
}

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
    purposes,
    preferenceTopics,
    partitionKey,
  }: {
    /** File to parse */
    file: string;
    /** The purposes */
    purposes: Purpose[];
    /** The preference topics */
    preferenceTopics: PreferenceTopic[];
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
  let preferences = readCsv(file, t.record(t.string, t.string));

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

  // Determine columns to map
  const columnNames = uniq(preferences.map((x) => Object.keys(x)).flat());

  // Determine the identifier column to work off of
  const remainingColumnsForTimestamp = difference(
    columnNames,
    currentState.identifierColumn ? [currentState.identifierColumn] : [],
  );
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
          remainingColumnsForTimestamp.find((col) =>
            col.toLowerCase().includes('date'),
          ) ||
          remainingColumnsForTimestamp.find((col) =>
            col.toLowerCase().includes('time'),
          ) ||
          remainingColumnsForTimestamp[0],
        choices: [...remainingColumnsForTimestamp, NONE_PREFERENCE_MAP],
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

  // Validate that all rows have valid timestamp
  if (currentState.timestampColum !== NONE_PREFERENCE_MAP) {
    const timestampColumnsMissing = preferences
      .map((pref, ind) => (pref[currentState.timestampColum!] ? null : [ind]))
      .filter((x): x is number[] => !!x)
      .flat();
    if (timestampColumnsMissing.length > 0) {
      throw new Error(
        `The timestamp column "${
          currentState.timestampColum
        }" is missing a value for the following rows: ${timestampColumnsMissing.join(
          '\n',
        )} in file "${file}"`,
      );
    }
    logger.info(
      colors.magenta(
        `The timestamp column "${currentState.timestampColum}" is present for all rows in file: "${file}"`,
      ),
    );
  }

  // Determine the identifier column to work off of
  const remainingColumnsForIdentifier = difference(
    columnNames,
    currentState.identifierColumn ? [currentState.identifierColumn] : [],
  );
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
          remainingColumnsForIdentifier.find((col) =>
            col.toLowerCase().includes('email'),
          ) || remainingColumnsForIdentifier[0],
        choices: remainingColumnsForIdentifier,
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
    logger.warn(
      colors.yellow(
        `The identifier column "${
          currentState.identifierColumn
        }" is missing a value for the following rows: ${identifierColumnsMissing.join(
          ', ',
        )} in file "${file}"`,
      ),
    );
    const skip = await inquirerConfirmBoolean({
      message: 'Would you like to skip rows missing an identifier?',
    });
    if (!skip) {
      throw new Error(
        `The identifier column "${
          currentState.identifierColumn
        }" is missing a value for the following rows: ${identifierColumnsMissing.join(
          ', ',
        )} in file "${file}"`,
      );
    }
    const previous = preferences.length;
    preferences = preferences.filter(
      (pref) => pref[currentState.identifierColumn!],
    );
    logger.info(
      colors.yellow(
        `Skipped ${
          previous - preferences.length
        } rows missing an identifier in file "${file}"`,
      ),
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
    const msg = `The identifier column "${
      currentState.identifierColumn
    }" has duplicate values for the following rows: ${duplicateIdentifiers
      .slice(0, 10)
      .map(([userId, rows]) => `${userId} (${rows.length})`)
      .join('\n')} in file "${file}"`;
    logger.warn(colors.yellow(msg));
    const skip = await inquirerConfirmBoolean({
      message: 'Would you like to automatically take the latest update?',
    });
    if (!skip) {
      throw new Error(msg);
    }
    preferences = Object.entries(rowsByUserId)
      .map(([, rows]) => {
        const sorted = rows.sort(
          (a, b) =>
            new Date(b[currentState.timestampColum!]).getTime() -
            new Date(a[currentState.timestampColum!]).getTime(),
        );
        return sorted[0];
      })
      .filter((x) => x);
  }

  // Ensure all rows are accounted for
  const otherColumns = difference(columnNames, [
    currentState.identifierColumn,
    currentState.timestampColum,
  ]);
  const purposeNames = [
    ...purposes.map((x) => x.trackingType),
    ...preferenceTopics.map((x) => `${x.purpose.trackingType}->${x.slug}`),
  ];
  if (otherColumns.length === 0) {
    throw new Error(`No other columns to process in file "${file}"`);
  }
  await mapSeries(otherColumns, async (col) => {
    // Determine the unique values to map in this column
    const uniqueValues = uniq(preferences.map((x) => x[col]));

    // Map the column to a purpose
    let purposeMapping = currentState.columnToPurposeName[col];
    if (purposeMapping) {
      logger.info(
        colors.magenta(
          `Column "${col}" is associated with purpose "${purposeMapping.purpose}" in file: "${file}"`,
        ),
      );
    } else {
      const { purposeName } = await inquirer.prompt<{
        /** purpose name */
        purposeName: string;
      }>([
        {
          name: 'purposeName',
          message: `Choose the purpose that column ${col} is associated with`,
          type: 'list',
          default: purposeNames[0],
          choices: purposeNames,
        },
      ]);
      purposeMapping = {
        purpose: purposeName,
        valueMapping: {},
      };
    }

    // map each value to the purpose value
    await mapSeries(uniqueValues, async (value) => {
      if (purposeMapping.valueMapping[value] !== undefined) {
        logger.info(
          colors.magenta(
            `Value "${value}" is associated with purpose value "${purposeMapping.valueMapping[value]}" in file: "${file}"`,
          ),
        );
        return;
      }
      const { purposeValue } = await inquirer.prompt<{
        /** purpose value */
        purposeValue: boolean;
      }>([
        {
          name: 'purposeValue',
          message: `Choose the purpose value for value "${value}" associated with purpose "${purposeMapping.purpose}"`,
          type: 'confirm',
        },
      ]);
      purposeMapping.valueMapping[value] = purposeValue;
    });

    currentState.columnToPurposeName[col] = purposeMapping;
    fileMetadata[file] = currentState;
    cache.setValue(fileMetadata, 'fileMetadata');
  });

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
    // used to compare if the preference has already been processed
    const userId = pref[currentState.identifierColumn!];
    const purposeMapping = otherColumns.reduce(
      (acc, col) =>
        Object.assign(acc, {
          [currentState.columnToPurposeName[col].purpose]:
            currentState.columnToPurposeName[col].valueMapping[pref[col]],
        }),
      {} as Record<string, boolean | string>,
    );

    // Grab current state of the update
    const currentConsentRecord = consentRecordByIdentifier[userId];

    // Check if the update can be skipped
    if (
      currentConsentRecord &&
      Object.entries(purposeMapping).every(
        ([key, value]) =>
          currentConsentRecord.purposes.find(
            (existingPurpose) => existingPurpose.purpose === key,
          )?.enabled === value,
      )
    ) {
      currentState.skippedUpdates[userId] = pref;
      return;
    }
    // console.log({
    //   purposeMapping,
    //   purposes: currentConsentRecord?.purposes,
    //   currentConsentRecord,
    //   userId,
    // });

    // Determine if there are any conflicts
    const hasConflicts =
      currentConsentRecord &&
      Object.entries(purposeMapping).find(([key, value]) => {
        const currentPurpose = currentConsentRecord.purposes.find(
          (existingPurpose) => existingPurpose.purpose === key,
        );
        return currentPurpose && currentPurpose.enabled !== value;
      });
    if (hasConflicts) {
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
  cache.setValue(fileMetadata, 'fileMetadata');
  const t1 = new Date().getTime();
  logger.info(
    colors.green(
      `Successfully pre-processed file: "${file}" in ${(t1 - t0) / 1000}s`,
    ),
  );
}

/* eslint-enable max-lines */
