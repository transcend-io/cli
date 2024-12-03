import uniq from 'lodash/uniq';
import groupBy from 'lodash/groupBy';
import colors from 'colors';
import inquirer from 'inquirer';
import difference from 'lodash/difference';
import { FileMetadataState } from './codecs';
import { logger } from '../logger';
import { inquirerConfirmBoolean } from '../helpers';

/* eslint-disable no-param-reassign */

/**
 * Parse identifiers from a CSV list of preferences
 *
 * Ensures that all rows have a valid identifier
 * and that all identifiers are unique.
 *
 * @param preferences - List of preferences
 * @param currentState - The current file metadata state for parsing this list
 * @returns The updated file metadata state
 */
export async function parsePreferenceIdentifiersFromCsv(
  preferences: Record<string, string>[],
  currentState: FileMetadataState,
): Promise<{
  /** The updated state */
  currentState: FileMetadataState;
  /** The updated preferences */
  preferences: Record<string, string>[];
}> {
  // Determine columns to map
  const columnNames = uniq(preferences.map((x) => Object.keys(x)).flat());

  // Determine the columns that could potentially be used for identifier
  const remainingColumnsForIdentifier = difference(columnNames, [
    ...(currentState.identifierColumn ? [currentState.identifierColumn] : []),
    ...Object.keys(currentState.columnToPurposeName),
  ]);

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
          remainingColumnsForIdentifier.find((col) =>
            col.toLowerCase().includes('email'),
          ) || remainingColumnsForIdentifier[0],
        choices: remainingColumnsForIdentifier,
      },
    ]);
    currentState.identifierColumn = identifierName;
  }
  logger.info(
    colors.magenta(
      `Using identifier column "${currentState.identifierColumn}"`,
    ),
  );

  // Validate that the identifier column is present for all rows and unique
  const identifierColumnsMissing = preferences
    .map((pref, ind) => (pref[currentState.identifierColumn!] ? null : [ind]))
    .filter((x): x is number[] => !!x)
    .flat();
  if (identifierColumnsMissing.length > 0) {
    const msg = `The identifier column "${
      currentState.identifierColumn
    }" is missing a value for the following rows: ${identifierColumnsMissing.join(
      ', ',
    )}`;
    logger.warn(colors.yellow(msg));

    // Ask user if they would like to skip rows missing an identifier
    const skip = await inquirerConfirmBoolean({
      message: 'Would you like to skip rows missing an identifier?',
    });
    if (!skip) {
      throw new Error(msg);
    }

    // Filter out rows missing an identifier
    const previous = preferences.length;
    preferences = preferences.filter(
      (pref) => pref[currentState.identifierColumn!],
    );
    logger.info(
      colors.yellow(
        `Skipped ${previous - preferences.length} rows missing an identifier`,
      ),
    );
  }
  logger.info(
    colors.magenta(
      `The identifier column "${currentState.identifierColumn}" is present for all rows`,
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
      .join('\n')}`;
    logger.warn(colors.yellow(msg));

    // Ask user if they would like to take the most recent update
    // for each duplicate identifier
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

  return { currentState, preferences };
}
/* eslint-enable no-param-reassign */
