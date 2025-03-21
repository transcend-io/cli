import {
  PreferenceStorePurposeResponse,
  PreferenceTopicType,
} from '@transcend-io/privacy-types';
import { PurposeRowMapping } from './codecs';
import { apply } from '@transcend-io/type-utils';
import { PreferenceTopic } from '../graphql';
import { splitCsvToList } from '../requests';

/**
 * Parse an arbitrary object to the Transcend PUT /v1/preference update shape
 * by using a mapping of column names to purpose/preference slugs.
 *
 * columnToPurposeName looks like:
 * {
 *   'my_purpose': 'Marketing',
 *   'has_topic_1': 'Marketing->BooleanPreference1',
 *   'has_topic_2': 'Marketing->BooleanPreference2'
 * }
 *
 * row looks like:
 * {
 *  'my_purpose': 'true',
 *  'has_topic_1': 'true',
 *  'has_topic_2': 'false'
 * }
 *
 * @param options - Options
 * @returns The parsed row
 */
export function getPreferenceUpdatesFromRow({
  row,
  columnToPurposeName,
  purposeSlugs,
  preferenceTopics,
}: {
  /** Row to parse */
  row: Record<string, string>;
  /** Mapping from column name ot row */
  columnToPurposeName: Record<string, PurposeRowMapping>;
  /** The set of allowed purpose slugs */
  purposeSlugs: string[];
  /** The preference topics */
  preferenceTopics: PreferenceTopic[];
}): {
    [k in string]: Omit<PreferenceStorePurposeResponse, 'purpose'>;
  } {
  // Create a result object to store the parsed preferences
  const result: {
    [k in string]: Partial<PreferenceStorePurposeResponse>;
  } = {};

  // Iterate over each column and map to the purpose or preference
  Object.entries(columnToPurposeName).forEach(
    ([columnName, { purpose, preference, valueMapping }]) => {
      // Ensure the purpose is valid
      if (!purposeSlugs.includes(purpose)) {
        throw new Error(
          `Invalid purpose slug: ${purpose}, expected: ${purposeSlugs.join(
            ', ',
          )}`,
        );
      }

      // CHeck if parsing a preference or just the top level purpose
      if (preference) {
        const preferenceTopic = preferenceTopics.find(
          (x) => x.slug === preference && x.purpose.trackingType === purpose,
        );
        if (!preferenceTopic) {
          const allowedTopics = preferenceTopics
            .filter((x) => x.purpose.trackingType === purpose)
            .map((x) => x.slug);
          throw new Error(
            `Invalid preference slug: ${preference} for purpose: ${purpose}. ` +
            `Allowed preference slugs for purpose are: ${allowedTopics.join(
              ',',
            )}`,
          );
        }

        // If parsing preferences, default to an empty array
        if (!result[purpose]) {
          result[purpose] = {
            preferences: [],
          };
        }
        if (!result[purpose].preferences) {
          result[purpose].preferences = [];
        }

        // The value to parse
        const rawValue = row[columnName];
        const rawMapping = valueMapping[rawValue];
        const trimmedMapping =
          typeof rawMapping === 'string' ? rawMapping.trim() || null : null;

        // handle each type of preference
        switch (preferenceTopic.type) {
          case PreferenceTopicType.Boolean:
            if (typeof rawMapping !== 'boolean') {
              throw new Error(
                `Invalid value for boolean preference: ${preference}, expected boolean, got: ${rawValue}`,
              );
            }
            result[purpose].preferences!.push({
              topic: preference,
              choice: {
                booleanValue: rawMapping,
              },
            });
            break;
          case PreferenceTopicType.Select:
            if (typeof rawMapping !== 'string' && rawMapping !== null) {
              throw new Error(
                `Invalid value for select preference: ${preference}, expected string or null, got: ${rawValue}`,
              );
            }

            if (
              trimmedMapping &&
              !preferenceTopic.preferenceOptionValues
                .map(({ slug }) => slug)
                .includes(trimmedMapping)
            ) {
              throw new Error(
                `Invalid value for select preference: ${preference}, expected one of: ` +
                `${preferenceTopic.preferenceOptionValues
                  .map(({ slug }) => slug)
                  .join(', ')}, got: ${rawValue}`,
              );
            }

            // Update preferences
            result[purpose].preferences!.push({
              topic: preference,
              choice: {
                selectValue: trimmedMapping,
              },
            });
            break;
          case PreferenceTopicType.MultiSelect:
            if (typeof rawValue !== 'string') {
              throw new Error(
                `Invalid value for multi select preference: ${preference}, expected string, got: ${rawValue}`,
              );
            }
            // Update preferences
            result[purpose].preferences!.push({
              topic: preference,
              choice: {
                selectValues: splitCsvToList(rawValue)
                  .map((val) => {
                    // FIXME: Support mapping multi select values
                    // The current prompt/parsing logic from `parsePreferenceAndPurposeValuesFromCsv` coerces everything to a boolean
                    const result = valueMapping[val];
                    if (typeof result !== 'string') {
                      throw new Error(
                        `Invalid value for multi select preference: ${preference}, ` +
                        `expected one of: ${preferenceTopic.preferenceOptionValues
                          .map(({ slug }) => slug)
                          .join(', ')}, got: ${result}`,
                      );
                    }
                    return result;
                  })
                  .sort((a, b) => a.localeCompare(b)),
              },
            });
            break;
          default:
            throw new Error(`Unknown preference type: ${preferenceTopic.type}`);
        }
      } else if (!result[purpose]) {
        // Handle updating top level purpose for the first time
        result[purpose] = {
          enabled: valueMapping[row[columnName]] === true,
        };
      } else {
        // Handle updating top level purpose but preserve preference updates
        result[purpose].enabled = valueMapping[row[columnName]] === true;
      }
    },
  );

  // Ensure that enabled is provided
  return apply(result, (x, purposeName) => {
    if (typeof x.enabled !== 'boolean') {
      throw new Error(
        `No mapping provided for purpose.enabled=true/false value: ${purposeName}`,
      );
    }
    return {
      ...x,
      enabled: x.enabled!,
    };
  });
}
