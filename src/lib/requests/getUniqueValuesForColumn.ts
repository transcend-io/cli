import { ObjByString } from '@transcend-io/type-utils';
import { uniq } from 'lodash-es';

/**
 * Return the unique set of values for a column in a CSV
 *
 * @param rows - Rows to look up
 * @param columnName - Name of column to grab values for
 * @returns Unique set of values in that column
 */
export function getUniqueValuesForColumn(
  rows: ObjByString[],
  columnName: string,
): string[] {
  return uniq(rows.map((row) => row[columnName] || '').flat());
}
