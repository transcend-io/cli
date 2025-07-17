import { ObjByString } from '@transcend-io/type-utils';
import colors from 'colors';
import inquirer from 'inquirer';
import { uniq } from 'lodash-es';
import { logger } from '../../logger';
import { NONE } from './constants';
import { getUniqueValuesForColumn } from './getUniqueValuesForColumn';

/**
 * Filter a list of CSV rows by column values
 * Choose columns that contain metadata to filter the requests
 *
 * @param rows - Rows to filter
 * @returns Filtered rows
 */
export async function filterRows(rows: ObjByString[]): Promise<ObjByString[]> {
  // Determine set of column names
  const columnNames = uniq(rows.map((x) => Object.keys(x)).flat());

  // update these variables recursively
  let filteredRows = rows;
  let keepFiltering = true;

  // loop over
  while (keepFiltering) {
    // Prompt user for column to filter on

    const { filterColumnName } = await inquirer.prompt<{
      /** Name of column to filter on */
      filterColumnName: string;
    }>([
      {
        name: 'filterColumnName',
        // eslint-disable-next-line max-len
        message: `If you need to filter the list of requests to import, choose the column to filter on. Currently ${filteredRows.length} rows.`,
        type: 'list',
        default: columnNames,
        choices: [NONE, ...columnNames],
      },
    ]);

    // Determine if filtering should continue, or loop should be exited
    keepFiltering = NONE !== filterColumnName;
    if (keepFiltering) {
      const options = getUniqueValuesForColumn(filteredRows, filterColumnName);

      const { valuesToKeep } = await inquirer.prompt<{
        /** Values to keep  */
        valuesToKeep: string[];
      }>([
        {
          name: 'valuesToKeep',
          message: 'Keep rows matching this value',
          type: 'checkbox',
          default: columnNames,
          choices: options,
        },
      ]);

      filteredRows = filteredRows.filter((request) =>
        valuesToKeep.includes(request[filterColumnName]),
      );
    }
  }

  logger.info(colors.magenta(`Importing ${filteredRows.length} requests`));
  return filteredRows;
}
