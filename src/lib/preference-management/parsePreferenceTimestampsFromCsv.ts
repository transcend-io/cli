import { uniq, difference } from 'lodash-es';
import colors from 'colors';
import inquirer from 'inquirer';
import { FileMetadataState } from './codecs';
import { logger } from '../../logger';

export const NONE_PREFERENCE_MAP = '[NONE]';

/* eslint-disable no-param-reassign */

/**
 * Parse timestamps from a CSV list of preferences
 *
 * When timestamp is requested, this script
 * ensures that all rows have a valid timestamp.
 *
 * Error is throw if timestamp is missing
 *
 * @param preferences - List of preferences
 * @param currentState - The current file metadata state for parsing this list
 * @returns The updated file metadata state
 */
export async function parsePreferenceTimestampsFromCsv(
  preferences: Record<string, string>[],
  currentState: FileMetadataState,
): Promise<FileMetadataState> {
  // Determine columns to map
  const columnNames = uniq(preferences.map((x) => Object.keys(x)).flat());

  // Determine the columns that could potentially be used for timestamp
  const remainingColumnsForTimestamp = difference(columnNames, [
    ...Object.keys(currentState.columnToIdentifier),
    ...Object.keys(currentState.columnToPurposeName),
  ]);

  // Determine the timestamp column to work off of
  if (!currentState.timestampColumn) {
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
    currentState.timestampColumn = timestampName;
  }
  logger.info(
    colors.magenta(`Using timestamp column "${currentState.timestampColumn}"`),
  );

  // Validate that all rows have valid timestamp
  if (currentState.timestampColumn !== NONE_PREFERENCE_MAP) {
    const timestampColumnsMissing = preferences
      .map((pref, ind) => (pref[currentState.timestampColumn!] ? null : [ind]))
      .filter((x): x is number[] => !!x)
      .flat();
    if (timestampColumnsMissing.length > 0) {
      throw new Error(
        `The timestamp column "${
          currentState.timestampColumn
        }" is missing a value for the following rows: ${timestampColumnsMissing.join(
          '\n',
        )}`,
      );
    }
    logger.info(
      colors.magenta(
        `The timestamp column "${currentState.timestampColumn}" is present for all row`,
      ),
    );
  }
  return currentState;
}
/* eslint-enable no-param-reassign */
