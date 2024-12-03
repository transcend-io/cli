import uniq from 'lodash/uniq';
import colors from 'colors';
import inquirer from 'inquirer';
import difference from 'lodash/difference';
import { FileMetadataState } from './codecs';
import { logger } from '../logger';
import { mapSeries } from 'bluebird';
import { PreferenceTopic } from '../graphql';

/* eslint-disable no-param-reassign */

/**
 * Parse out the purpose.enabled and preference values from a CSV file
 *
 * @param preferences - List of preferences
 * @param currentState - The current file metadata state for parsing this list
 * @param options - Options
 * @returns The updated file metadata state
 */
export async function parsePreferenceAndPurposeValuesFromCsv(
  preferences: Record<string, string>[],
  currentState: FileMetadataState,
  {
    purposeSlugs,
    preferenceTopics,
  }: {
    /** The purpose slugs that are allowed to be updated */
    purposeSlugs: string[];
    /** The preference topics */
    preferenceTopics: PreferenceTopic[];
  },
): Promise<FileMetadataState> {
  // Determine columns to map
  const columnNames = uniq(preferences.map((x) => Object.keys(x)).flat());

  // Determine the columns that could potentially be used for identifier
  const otherColumns = difference(columnNames, [
    ...(currentState.identifierColumn ? [currentState.identifierColumn] : []),
    ...(currentState.timestampColum ? [currentState.timestampColum] : []),
  ]);
  if (otherColumns.length === 0) {
    throw new Error('No other columns to process');
  }

  // The purpose and preferences to map to
  const purposeNames = [
    ...purposeSlugs,
    ...preferenceTopics.map((x) => `${x.purpose.trackingType}->${x.slug}`),
  ];

  // Ensure all columns are accounted for
  await mapSeries(otherColumns, async (col) => {
    // Determine the unique values to map in this column
    const uniqueValues = uniq(preferences.map((x) => x[col]));

    // Map the column to a purpose
    let purposeMapping = currentState.columnToPurposeName[col];
    if (purposeMapping) {
      logger.info(
        colors.magenta(
          `Column "${col}" is associated with purpose "${purposeMapping.purpose}"`,
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
      const [purposeSlug, preferenceSlug] = purposeName.split('->');
      purposeMapping = {
        purpose: purposeSlug,
        preference: preferenceSlug || null,
        valueMapping: {},
      };
    }

    // map each value to the purpose value
    await mapSeries(uniqueValues, async (value) => {
      if (purposeMapping.valueMapping[value] !== undefined) {
        logger.info(
          colors.magenta(
            `Value "${value}" is associated with purpose value "${purposeMapping.valueMapping[value]}"`,
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
          default: value !== 'false',
        },
      ]);
      purposeMapping.valueMapping[value] = purposeValue;
    });

    currentState.columnToPurposeName[col] = purposeMapping;
  });

  return currentState;
}
/* eslint-enable no-param-reassign */
