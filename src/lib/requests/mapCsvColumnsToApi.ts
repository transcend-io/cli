import { getValues, getEntries } from '@transcend-io/type-utils';
import type { PersistedState } from '@transcend-io/persisted-state';
import inquirer from 'inquirer';
import { startCase } from 'lodash-es';
import {
  ColumnName,
  CachedFileState,
  IS_REQUIRED,
  CAN_APPLY_IN_BULK,
} from './constants';
import { fuzzyMatchColumns } from './fuzzyMatchColumns';

/**
 * Mapping from column name to request input parameter
 */
export type ColumnNameMap = {
  [k in ColumnName]?: string;
};

/**
 * Determine the mapping between columns in CSV
 *
 * @param columnNames - The set of column names
 * @param state - The cached file state used to map DSR inputs
 * @returns The column name mapping
 */
export async function mapCsvColumnsToApi(
  columnNames: string[],
  state: PersistedState<typeof CachedFileState>,
): Promise<ColumnNameMap> {
  // Determine the columns that should be mapped
  const columnQuestions = getValues(ColumnName).filter(
    (name) => !state.getValue('columnNames', name),
  );

  // Skip mapping when everything is mapped
  const columnNameMap =
    columnQuestions.length === 0
      ? {}
      : // prompt questions to map columns
        await inquirer.prompt<{
          [k in ColumnName]?: string;
        }>(
          columnQuestions.map((name) => {
            const field = titleCase(name.replace('ColumnName', ''));
            const matches = fuzzyMatchColumns(
              columnNames,
              field,
              IS_REQUIRED[name],
              !!CAN_APPLY_IN_BULK[name],
            );
            return {
              name,
              message: `Choose the column that will be used to map in the field: ${field}`,
              type: 'list',
              default: matches[0],
              choices: matches,
            };
          }),
        );

  await Promise.all(
    getEntries(columnNameMap).map(([k, v]) =>
      state.setValue(v, 'columnNames', k),
    ),
  );
  return columnNameMap;
}
