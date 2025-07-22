import fuzzysearch from 'fuzzysearch';
import inquirer from 'inquirer';
import { BULK_APPLY, NONE } from './constants';

/**
 * Check if word1 and word2 are a fuzzy match of each other.
 * Returns true if word1 is fuzzy match of word2 or vice versa.
 *
 * @param word1 - First word
 * @param word2 - Second word
 * @returns True if words are fuzzy match
 */
export function fuzzySearch(word1: string, word2: string): boolean {
  return (
    fuzzysearch(word1.toLowerCase(), word2.toLowerCase()) ||
    fuzzysearch(word2.toLowerCase(), word1.toLowerCase())
  );
}

/**
 * Fuzzy match column names for a particular field
 *
 * @param allColumnNames - List of all column names
 * @param fuzzyMapName - The name of field being mapped to
 * @param isRequired - When true, don't include "NONE" as an option
 * @param canApplyAll - When true, include an option to specify the value in bulk
 * @returns The list of suggestions for inquirer
 */
export function fuzzyMatchColumns(
  allColumnNames: string[],
  fuzzyMapName: string,
  isRequired: boolean,
  canApplyAll?: boolean,
): (string | InstanceType<typeof inquirer.Separator>)[] {
  const matchingColumnNames = allColumnNames.filter((x) =>
    fuzzySearch(fuzzyMapName.toLowerCase(), x.toLowerCase()),
  );
  return [
    ...matchingColumnNames,
    new inquirer.Separator(),
    ...(isRequired ? [] : [NONE]),
    ...(canApplyAll ? [BULK_APPLY] : []),
    ...allColumnNames.filter((x) => !matchingColumnNames.includes(x)),
  ];
}
