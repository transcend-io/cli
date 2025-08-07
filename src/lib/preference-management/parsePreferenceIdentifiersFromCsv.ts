// groupBy
import { uniq, keyBy } from 'lodash-es';
import colors from 'colors';
import inquirer from 'inquirer';
import { FileMetadataState } from './codecs';
import { logger } from '../../logger';
import { inquirerConfirmBoolean } from '../helpers';
import { mapSeries } from '../bluebird-replace';
import type { Identifier } from '../graphql';
import type { PreferenceStoreIdentifier } from '@transcend-io/privacy-types';

/* eslint-disable no-param-reassign */

/**
 * Parse identifiers from a CSV list of preferences
 *
 * Ensures that all rows have a valid identifier
 * and that all identifiers are unique.
 *
 * @param preferences - List of preferences
 * @param currentState - The current file metadata state for parsing this list
 * @param orgIdentifiers - The list of identifiers configured for the org
 * @param allowedIdentifierNames - The list of identifier names that are allowed for this upload
 * @param identifierColumns - The columns in the CSV that should be used as identifiers
 * @returns The updated file metadata state
 */
export async function parsePreferenceIdentifiersFromCsv(
  preferences: Record<string, string>[],
  currentState: FileMetadataState,
  orgIdentifiers: Identifier[],
  allowedIdentifierNames: string[],
  identifierColumns: string[],
): Promise<{
  /** The updated state */
  currentState: FileMetadataState;
  /** The updated preferences */
  preferences: Record<string, string>[];
}> {
  const columnNames = uniq(
    preferences.map((x) => Object.keys(x)).flat(),
  ).filter((col) => identifierColumns.includes(col));
  // Determine columns to map
  const orgIdentifiersByName = keyBy(orgIdentifiers, 'name');
  const filteredOrgIdentifiers = allowedIdentifierNames
    .map((name) => orgIdentifiersByName[name])
    .filter(Boolean);
  if (filteredOrgIdentifiers.length !== allowedIdentifierNames.length) {
    const missingIdentifiers = allowedIdentifierNames.filter(
      (name) => !orgIdentifiersByName[name],
    );
    throw new Error(
      `No identifier configuration found for "${missingIdentifiers.join(
        '","',
      )}"`,
    );
  }
  if (columnNames.length !== identifierColumns.length) {
    const missingColumns = identifierColumns.filter(
      (col) => !columnNames.includes(col),
    );
    throw new Error(
      `The following identifier columns are missing from the CSV: "${missingColumns.join(
        '","',
      )}"`,
    );
  }

  if (
    filteredOrgIdentifiers.filter(
      (identifier) => identifier.isUniqueOnPreferenceStore,
    ).length === 0
  ) {
    throw new Error(
      'No unique identifier we provided as part of allowedIdentifierNames. Please ensure that at least one of the allowed ' +
        'identifiers is configured as unique on the preference store.',
    );
  }

  // Determine the columns that could potentially be used for identifiers
  await mapSeries(identifierColumns, async (col) => {
    // Map the column to an identifier
    const identifierMapping = currentState.columnToIdentifier[col];
    if (identifierMapping) {
      logger.info(
        colors.magenta(
          `Column "${col}" is associated with identifier "${identifierMapping.name}"`,
        ),
      );
      return;
    }
    // If the column is not mapped, ask the user to map it
    const { identifierName } = await inquirer.prompt<{
      /** Identifier name */
      identifierName: string;
    }>([
      {
        name: 'identifierName',
        message: `Choose the identifier name for column "${col}"`,
        type: 'list',
        // Default to the first allowed identifier name
        default: allowedIdentifierNames.find((x) => x.startsWith(col)),
        choices: allowedIdentifierNames,
      },
    ]);
    currentState.columnToIdentifier[col] = {
      name: identifierName,
      isUniqueOnPreferenceStore:
        orgIdentifiersByName[identifierName].isUniqueOnPreferenceStore,
    };
  });

  const uniqueIdentifierColumns = Object.entries(
    currentState.columnToIdentifier,
  )
    .filter(
      ([, identifierMapping]) => identifierMapping.isUniqueOnPreferenceStore,
    )
    .map(([col]) => col);

  // Validate that the at least 1 unique identifier column is present
  const uniqueIdentifierMissingIndexes = preferences
    .map((pref, ind) =>
      uniqueIdentifierColumns.some((col) => !!pref[col]) ? null : [ind],
    )
    .filter((x): x is number[] => !!x)
    .flat();

  if (uniqueIdentifierMissingIndexes.length > 0) {
    const msg = `
    The following rows ${uniqueIdentifierMissingIndexes.join(
      ', ',
    )} do not have any unique identifier values for the columns "${uniqueIdentifierColumns.join(
      '", "',
    )}".`;
    logger.warn(colors.yellow(msg));

    // Ask user if they would like to skip rows missing an identifier
    const skip = await inquirerConfirmBoolean({
      message: 'Would you like to skip rows missing unique identifiers?',
    });
    if (!skip) {
      throw new Error(msg);
    }

    // Filter out rows missing an identifier
    const previous = preferences.length;
    preferences = preferences.filter(
      (pref, index) => !uniqueIdentifierMissingIndexes.includes(index),
    );
    logger.info(
      colors.yellow(
        `Skipped ${
          previous - preferences.length
        } rows missing unique identifiers`,
      ),
    );
  }
  logger.info(
    colors.magenta(
      `At least one unique identifier column is present for all ${preferences.length} rows.`,
    ),
  );

  return { currentState, preferences };
}
/* eslint-enable no-param-reassign */

/**
 * Helper function to get the identifiers payload from a row
 *
 * @param options - Options
 * @param options.row - The current row from CSV file
 * @param options.columnToIdentifier - The column to identifier mapping metadata
 * @returns The updated preferences with identifiers payload
 */
export function getPreferenceIdentifiersFromRow({
  row,
  columnToIdentifier,
}: {
  /** The current row from CSV file */
  row: Record<string, string>;
  /** The current file metadata state */
  columnToIdentifier: FileMetadataState['columnToIdentifier'];
}): PreferenceStoreIdentifier[] {
  return Object.entries(columnToIdentifier)
    .filter(([col]) => !!row[col])
    .map(([col, identifierMapping]) => ({
      name: identifierMapping.name,
      value: row[col],
    }));
}

/**
 * Helper function to get unique identifier name present in a row
 *
 * @param options - Options
 * @param options.row - The current row from CSV file
 * @param options.columnToIdentifier - The column to identifier mapping metadata
 * @returns The unique identifier names present in the row
 */
export function getUniquePreferenceIdentifierNamesFromRow({
  row,
  columnToIdentifier,
}: {
  /** The current row from CSV file */
  row: Record<string, string>;
  /** The current file metadata state */
  columnToIdentifier: FileMetadataState['columnToIdentifier'];
}): string[] {
  return Object.keys(columnToIdentifier).filter(
    (col) => row[col] && columnToIdentifier[col].isUniqueOnPreferenceStore,
  );
}
