import * as fastcsv from 'fast-csv';
import { createWriteStream } from 'fs';

import { ObjByString } from '@transcend-io/type-utils';

/**
 * Write a csv to file
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
