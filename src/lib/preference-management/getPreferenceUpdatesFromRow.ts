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
 * `columnToPurposeName` looks like:
 * {
 *   'my_purpose': { purpose: 'Marketing', preference: null, valueMapping: { 'true': true, 'false': false } },
 *   'has_topic_1': { purpose: 'Marketing', preference: 'BooleanPreference1', valueMapping: { 'true': true, 'false': false } },
 *   'has_topic_2': { purpose: 'Marketing', preference: 'SingleSelectPreference', valueMapping: { 'Option 1': 'Value1', 'Option 2': 'Value2' } }
 * }
 *
 * `row` looks like:
 * {
 *  'my_purpose': 'true',
 *  'has_topic_1': 'true',
 *  'has_topic_2': 'Option 1'
 * }
 *
 * OMISSION RULE:
 * - If `valueMapping[row[columnName]]`
 *   returns `undefined` or `null`, we **omit** that column entirely (do not set purpose enabled, do not push a preference).
 *   - For MultiSelect, **each token** is treated independently: tokens that map to `undefined|null` are skipped;
 *       if all tokens are skipped, nothing is pushed.
 * - We still validate **types** for mapped values (e.g., boolean must map to boolean, select must map to string, etc.).
 *
 * NOTE:
 * - Final shape must have `enabled` for every purpose touched (enforced by `apply` below). If you omit all top-level purpose mappings,
 *   but emit preferences, this will throw at the end. This preserves the existing “enabled required” contract.
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
  /** Mapping from column name to parser config */
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

      // The raw value from the CSV row for this column
      const rawValue = row[columnName];

      // Check if parsing a preference or just the top level purpose
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

        // Ensure destination array
        if (!result[purpose]) {
          result[purpose] = {
            preferences: [],
          };
        }
        if (!result[purpose].preferences) {
          result[purpose].preferences = [];
        }

        // handle each type of preference
        switch (preferenceTopic.type) {
          case PreferenceTopicType.Boolean: {
            const mappedValue = valueMapping[rawValue];
            // Throw error on missing mapping
            if (mappedValue === undefined && rawValue !== '') {
              throw new Error(
                `No preference mapping found for value "${rawValue}" in column ` +
                  `"${columnName}" (purpose=${purpose}, preference=${preference})`,
              );
            }

            // Purposefully missing mapping
            if (mappedValue === null || mappedValue === undefined) {
              return;
            }

            // Ensure boolean
            if (typeof mappedValue !== 'boolean') {
              throw new Error(
                `Invalid value for boolean preference: ${preference}, expected boolean, got: ${rawValue}`,
              );
            }
            result[purpose].preferences!.push({
              topic: preference,
              choice: { booleanValue: mappedValue },
            });
            break;
          }

          case PreferenceTopicType.Select: {
            const mappedValue = valueMapping[rawValue];
            // Throw error on missing mapping
            if (mappedValue === undefined && rawValue !== '') {
              throw new Error(
                `No preference mapping found for value "${rawValue}" in column ` +
                  `"${columnName}" (purpose=${purpose}, preference=${preference})`,
              );
            }

            // Omit if null
            if (mappedValue === null || mappedValue === undefined) {
              return;
            }

            // Ensure string
            if (typeof mappedValue !== 'string') {
              throw new Error(
                `Invalid value for select preference: ${preference}, expected string, got: ${rawValue}`,
              );
            }
            const trimmed = mappedValue.trim() || null;

            if (
              trimmed &&
              !preferenceTopic.preferenceOptionValues
                .map(({ slug }) => slug)
                .includes(trimmed)
            ) {
              throw new Error(
                `Invalid value for select preference: ${preference}, expected one of: ` +
                  `${preferenceTopic.preferenceOptionValues
                    .map(({ slug }) => slug)
                    .join(', ')}, got: ${rawValue}`,
              );
            }

            result[purpose].preferences!.push({
              topic: preference,
              choice: { selectValue: trimmed },
            });
            break;
          }

          case PreferenceTopicType.MultiSelect: {
            if (typeof rawValue !== 'string') {
              throw new Error(
                `Invalid value for multi select preference: ${preference}, expected string, got: ${rawValue}`,
              );
            }

            // IMPORTANT: Do NOT rely on valueMapping[rawValue] for CSV.
            // Split and map per token with the new rule.
            const selectValues = splitCsvToList(rawValue)
              .map((token) => {
                const tokenMapped = valueMapping[token];
                // Throw error on missing mapping
                if (tokenMapped === undefined && rawValue !== '') {
                  throw new Error(
                    `No preference mapping found for multi select token "${rawValue}" in column ` +
                      `"${columnName}" (purpose=${purpose}, preference=${preference})`,
                  );
                }

                // Omit if null
                if (tokenMapped === null || tokenMapped === undefined) {
                  return null;
                }

                // Ensure string
                if (typeof tokenMapped !== 'string') {
                  throw new Error(
                    `Invalid value for multi select preference: ${preference}, ` +
                      `expected one of: ${preferenceTopic.preferenceOptionValues
                        .map(({ slug }) => slug)
                        .join(', ')}, got: ${token}`,
                  );
                }
                return tokenMapped;
              })
              .filter((x): x is string => x !== null)
              .sort((a, b) => a.localeCompare(b));

            // Only push if at least one mapped token survived
            if (selectValues.length > 0) {
              result[purpose].preferences!.push({
                topic: preference,
                choice: { selectValues },
              });
            }
            break;
          }

          default:
            throw new Error(`Unknown preference type: ${preferenceTopic.type}`);
        }
      } else {
        // Top-level purpose (no preference)
        const mappedValue = valueMapping[rawValue];
        if (mappedValue === undefined && rawValue !== '') {
          throw new Error(
            `No preference mapping found for value "${rawValue}" in column ` +
              `"${columnName}" (purpose=${purpose}, preference=∅)`,
          );
        }
        if (mappedValue === null) {
          return; // Omit if null
        }

        if (!result[purpose]) {
          // Top-level purpose: set enabled strictly from mapped boolean
          result[purpose] = { enabled: mappedValue === true };
        } else {
          // Preserve preferences; update enabled
          result[purpose].enabled = mappedValue === true;
        }
      }
    },
  );

  // Ensure that enabled is provided for any purpose that appears.
  // (This preserves the prior contract and existing tests.)
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
