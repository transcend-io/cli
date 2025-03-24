import * as fastcsv from 'fast-csv';
import { createWriteStream } from 'fs';
import { writeFileSync } from 'fs';

import { ObjByString } from '@transcend-io/type-utils';

/**
 * Write a csv to file synchronously
 *
 * @param filePath - File to write out to
 * @param data - Data to write
 * @param headers - Headers
 */
export function writeCsvSync(
  filePath: string,
  data: ObjByString[],
  headers: boolean | string[] = true,
): void {
  const rows: string[][] = [];
  if (headers) {
    const headerRow = Array.isArray(headers) ? headers : Object.keys(data[0] || {});
    rows.push(headerRow);
  }
  rows.push(...data.map(row => Object.values(row)));

  const csvContent = rows.map(row => row.join(',')).join('\n');
  writeFileSync(filePath, csvContent);
}

/**
 * Write a csv to file asynchronously
 *
 * @param filePath - File to write out to
 * @param data - Data to write
 * @param headers - Headers
 */
export async function writeCsv(
  filePath: string,
  data: ObjByString[],
  headers: boolean | string[] = true,
): Promise<void> {
  const ws = createWriteStream(filePath);
  await new Promise((resolve, reject) => {
    try {
      fastcsv
        .write(data, { headers })
        .pipe(ws)
        .on('error', reject)
        .on('end', () => resolve(true));
    } catch (err) {
      reject(err);
    }
  });
}