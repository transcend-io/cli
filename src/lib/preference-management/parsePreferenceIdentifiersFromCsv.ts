// groupBy
import { uniq, keyBy } from 'lodash-es';
import colors from 'colors';
import inquirer from 'inquirer';
import type {
  FileFormatState,
  IdentifierMetadataForPreference,
} from './codecs';
import { logger } from '../../logger';
import { inquirerConfirmBoolean } from '../helpers';
import Bluebird from 'bluebird';
import type { Identifier } from '../graphql';
import type { PreferenceStoreIdentifier } from '@transcend-io/privacy-types';
import type { PersistedState } from '@transcend-io/persisted-state';

const { mapSeries } = Bluebird;

/* eslint-disable no-param-reassign */

/**
 * Parse identifiers from a CSV list of preferences
 *
 * Ensures that all rows have a valid identifier
 * and that all identifiers are unique.
 *
 * @param preferences - List of preferences
 * @param options - Options
 * @returns The updated file metadata state
 */
export async function parsePreferenceIdentifiersFromCsv(
  preferences: Record<string, string>[],
  {
    schemaState,
    orgIdentifiers,
    allowedIdentifierNames,
    identifierColumns,
    nonInteractive = false,
  }: {
    /** The current state of the schema metadata */
    schemaState: PersistedState<typeof FileFormatState>;
    /** The list of identifiers configured for the org */
    orgIdentifiers: Identifier[];
    /** The list of identifier names that are allowed for this upload */
    allowedIdentifierNames: string[];
    /** The columns in the CSV that should be used as identifiers */
    identifierColumns: string[];
    /** When true, throw instead of prompting (for worker processes) */
    nonInteractive?: boolean;
  },
): Promise<{
  /** The updated state */
  schemaState: PersistedState<typeof FileFormatState>;
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
      'No unique identifier was provided. Please ensure that at least one ' +
        'of the allowed identifiers is configured as unique on the preference store.',
    );
  }

  // Determine the columns that could potentially be used for identifiers
  const currentColumnToIdentifier = schemaState.getValue('columnToIdentifier');
  await mapSeries(identifierColumns, async (col) => {
    // Map the column to an identifier
    const identifierMapping = currentColumnToIdentifier[col];
    if (identifierMapping) {
      logger.info(
        colors.magenta(
          `Column "${col}" is associated with identifier "${identifierMapping.name}"`,
        ),
      );
      return;
    }

    if (nonInteractive) {
      throw new Error(
        `Column "${col}" has no identifier mapping in the config. ` +
          "Run 'transcend consent configure-preference-upload' to update the config.",
      );
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
    currentColumnToIdentifier[col] = {
      name: identifierName,
      isUniqueOnPreferenceStore:
        orgIdentifiersByName[identifierName].isUniqueOnPreferenceStore,
    };
  });
  schemaState.setValue(currentColumnToIdentifier, 'columnToIdentifier');

  const uniqueIdentifierColumns = Object.entries(currentColumnToIdentifier)
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

    if (nonInteractive) {
      throw new Error(msg);
    }

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

  return { schemaState, preferences };
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
  columnToIdentifier: FileFormatState['columnToIdentifier'];
}): PreferenceStoreIdentifier[] {
  const identifiers = Object.entries(columnToIdentifier)
    .filter(([col]) => !!row[col])
    .map(([col, identifierMapping]) => ({
      name: identifierMapping.name,
      value: row[col],
    }));
  // put email first if it exists
  // TODO: https://linear.app/transcend/issue/PIK-285/set-precedence-of-unique-identifiers - remove email logic
  return identifiers.sort(
    (a, b) =>
      (a.name === 'email' ? -1 : 0) - (b.name === 'email' ? -1 : 0) ||
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );
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
  columnToIdentifier: FileFormatState['columnToIdentifier'];
}): (IdentifierMetadataForPreference & {
  /** Column name */
  columnName: string;
  /** Value of the identifier in the row */
  value: string;
})[] {
  // TODO: https://linear.app/transcend/issue/PIK-285/set-precedence-of-unique-identifiers - remove email logic
  // sort email to the front
  return Object.entries(columnToIdentifier)
    .sort(
      ([, a], [, b]) =>
        (a.name === 'email' ? -1 : 0) - (b.name === 'email' ? -1 : 0) ||
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    )
    .filter(
      ([col]) => row[col] && columnToIdentifier[col].isUniqueOnPreferenceStore,
    )
    .map(([col, identifier]) => ({
      ...identifier,
      columnName: col,
      value: row[col],
    }));
}
