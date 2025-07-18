import type { PersistedState } from '@transcend-io/persisted-state';
import { getEntries, getValues } from '@transcend-io/type-utils';
import inquirer from 'inquirer';
import { startCase } from 'lodash-es';
import {
  CachedFileState,
  CAN_APPLY_IN_BULK,
  ColumnName,
  IS_REQUIRED,
} from './constants';
import { fuzzyMatchColumns } from './fuzzyMatchColumns';

/**
 * Mapping from column name to request input parameter
 */
export type ColumnNameMap = Partial<Record<ColumnName, string>>;

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
        await inquirer.prompt<Partial<Record<ColumnName, string>>>(
          columnQuestions.map((name) => {
            const field = startCase(name.replace('ColumnName', ''));
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
