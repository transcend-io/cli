import colors from 'colors';
import inquirer from 'inquirer';
import { difference, uniq } from 'lodash-es';
import { logger } from '../../logger';
import { FileMetadataState } from './codecs';

export const NONE_PREFERENCE_MAP = '[NONE]';

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
  const columnNames = uniq(preferences.flatMap((x) => Object.keys(x)));

  // Determine the columns that could potentially be used for timestamp
  const remainingColumnsForTimestamp = difference(columnNames, [
    ...(currentState.identifierColumn ? [currentState.identifierColumn] : []),
    ...Object.keys(currentState.columnToPurposeName),
  ]);

  // Determine the timestamp column to work off of
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
  }
  logger.info(
    colors.magenta(`Using timestamp column "${currentState.timestampColum}"`),
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
        )}`,
      );
    }
    logger.info(
      colors.magenta(
        `The timestamp column "${currentState.timestampColum}" is present for all row`,
      ),
    );
  }
  return currentState;
}
