import { uniq, difference } from 'lodash-es';
import colors from 'colors';
import inquirer from 'inquirer';
import { FileFormatState } from './codecs';
import { logger } from '../../logger';
import Bluebird from 'bluebird';
import { PreferenceTopic } from '../graphql';
import { PreferenceTopicType } from '@transcend-io/privacy-types';
import { splitCsvToList } from '../requests';
import type { PersistedState } from '@transcend-io/persisted-state';

const { mapSeries } = Bluebird;

/**
 * Parse out the purpose.enabled and preference values from a CSV file
 *
 * @param preferences - List of preferences
 * @param schemaState - The schema state to use for parsing the file
 * @param options - Options
 * @returns The updated file metadata state
 */
export async function parsePreferenceAndPurposeValuesFromCsv(
  preferences: Record<string, string>[],
  schemaState: PersistedState<typeof FileFormatState>,
  {
    purposeSlugs,
    preferenceTopics,
    forceTriggerWorkflows,
    columnsToIgnore,
  }: {
    /** The purpose slugs that are allowed to be updated */
    purposeSlugs: string[];
    /** The preference topics */
    preferenceTopics: PreferenceTopic[];
    /** Force workflow triggers */
    forceTriggerWorkflows: boolean;
    /** Columns to ignore in the CSV file */
    columnsToIgnore: string[];
  },
): Promise<PersistedState<typeof FileFormatState>> {
  // Determine columns to map
  const columnNames = uniq(preferences.map((x) => Object.keys(x)).flat());

  // Determine the columns that could potentially be used for identifier
  const timestampCol = schemaState.getValue('timestampColumn');
  const otherColumns = difference(columnNames, [
    ...Object.keys(schemaState.getValue('columnToIdentifier')),
    ...(timestampCol ? [timestampCol] : []),
    ...columnsToIgnore,
  ]);
  if (otherColumns.length === 0) {
    if (forceTriggerWorkflows) {
      return schemaState;
    }
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
    const uniqueValues = uniq(
      preferences.filter((x) => (x[col] || '').trim()).map((x) => x[col]),
    );

    // Map the column to a purpose
    const currentPurposeMapping = schemaState.getValue('columnToPurposeName');
    let purposeMapping = currentPurposeMapping[col];
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
          default: purposeNames.find((x) => x.startsWith(purposeSlugs[0])),
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
      // if preference is null, this column is just for the purpose
      if (purposeMapping.preference === null) {
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
      }

      // if preference is not null, this column is for a specific preference
      if (purposeMapping.preference !== null) {
        const preferenceTopic = preferenceTopics.find(
          (x) => x.slug === purposeMapping.preference,
        );
        if (!preferenceTopic) {
          logger.error(
            colors.red(
              `Preference topic "${purposeMapping.preference}" not found`,
            ),
          );
          return;
        }
        const preferenceOptions = preferenceTopic.preferenceOptionValues.map(
          ({ slug }) => slug,
        );

        if (preferenceTopic.type === PreferenceTopicType.Boolean) {
          const { preferenceValue } = await inquirer.prompt<{
            /** purpose value */
            preferenceValue: boolean;
          }>([
            {
              name: 'preferenceValue',
              message:
                // eslint-disable-next-line max-len
                `Choose the preference value for "${preferenceTopic.slug}" value "${value}" associated with purpose "${purposeMapping.purpose}"`,
              type: 'confirm',
              default: value !== 'false',
            },
          ]);
          purposeMapping.valueMapping[value] = preferenceValue;
          return;
        }

        if (preferenceTopic.type === PreferenceTopicType.Select) {
          const { preferenceValue } = await inquirer.prompt<{
            /** purpose value */
            preferenceValue: boolean;
          }>([
            {
              name: 'preferenceValue',
              // eslint-disable-next-line max-len
              message: `Choose the preference value for "${preferenceTopic.slug}" value "${value}" associated with purpose "${purposeMapping.purpose}"`,
              type: 'list',
              choices: preferenceOptions,
              default: preferenceOptions.find((x) => x === value),
            },
          ]);
          purposeMapping.valueMapping[value] = preferenceValue;
          return;
        }

        if (preferenceTopic.type === PreferenceTopicType.MultiSelect) {
          const parsedValues = splitCsvToList(value);
          // need to do this serially
          await mapSeries(parsedValues, async (parsedValue) => {
            // if we already have a value, skip re-processing it again
            if (purposeMapping.valueMapping[parsedValue] !== undefined) {
              return;
            }
            const { preferenceValue } = await inquirer.prompt<{
              /** purpose value */
              preferenceValue: boolean;
            }>([
              {
                name: 'preferenceValue',
                // eslint-disable-next-line max-len
                message: `Choose the preference value for "${preferenceTopic.slug}" value "${parsedValue}" associated with purpose "${purposeMapping.purpose}"`,
                type: 'list',
                choices: preferenceOptions,
                default: preferenceOptions.find((x) => x === parsedValue),
              },
            ]);
            purposeMapping.valueMapping[parsedValue] = preferenceValue;
          });
          return;
        }

        throw new Error(
          `Unknown preference topic type: ${preferenceTopic.type}`,
        );
      }
    });
    currentPurposeMapping[col] = purposeMapping;
    schemaState.setValue(currentPurposeMapping, 'columnToPurposeName');
  });

  return schemaState;
}
