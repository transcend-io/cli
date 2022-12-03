import { getValues, getEntries } from '@transcend-io/type-utils';
import inquirer from 'inquirer';
import titleCase from 'lodash/startCase';
import { ColumnName, CachedFileState, IS_REQUIRED } from './constants';
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
 * @param cached - The cached file state used to map DSR inputs
 * @returns The column name mapping
 */
export async function mapCsvColumnsToApi(
  columnNames: string[],
  cached: CachedFileState,
): Promise<ColumnNameMap> {
  // Determine the columns that should be mapped
  const columnQuestions = getValues(ColumnName).filter(
    (name) => !cached.columnNames[name],
  );

  // Skip mapping when everything is mapped
  const columnNameMap =
    columnQuestions.length === 0
      ? {}
      : // prompt questions to map columns
        await inquirer.prompt<
          {
            [k in ColumnName]?: string;
          }
        >(
          columnQuestions.map((name) => {
            const field = titleCase(name.replace('ColumnName', ''));
            const matches = fuzzyMatchColumns(
              columnNames,
              field,
              IS_REQUIRED[name],
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
  getEntries(columnNameMap).forEach(([k, v]) => {
    // eslint-disable-next-line no-param-reassign
    cached.columnNames[k] = v;
  });
  return columnNameMap;
}
