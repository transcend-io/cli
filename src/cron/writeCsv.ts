import * as fastcsv from 'fast-csv';
import { createWriteStream, writeFileSync, appendFileSync } from 'fs';

import { ObjByString } from '@transcend-io/type-utils';

/**
 * Escape a CSV value
 *
 * @param value - Value to escape
 * @returns Escaped value
 */
function escapeCsvValue(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
/**
 * Write a csv to file synchronously, overwriting any existing content
 *
 * @param filePath - File to write out to
 * @param data - Data to write
 * @param headers - Headers. If true, use object keys as headers. If array, use provided headers.
 */
export function writeCsvSync(
  filePath: string,
  data: ObjByString[],
  headers: boolean | string[] = true,
): void {
  const rows: string[][] = [];

  // Add headers if specified
  if (headers) {
    const headerRow = Array.isArray(headers) ? headers : Object.keys(data[0] || {});
    rows.push(headerRow);
  }

  // Add data rows
  rows.push(...data.map((row) => Object.values(row)));

  // Build CSV content with proper escaping
  const csvContent = rows
    .map((row) => row.map(escapeCsvValue).join(','))
    .join('\n');

  // Write to file, overwriting existing content
  writeFileSync(filePath, csvContent);
}

/**
 * Append data to an existing csv file synchronously
 * Assumes the data structure matches the existing file
 *
 * @param filePath - File to append to
 * @param data - Data to append
 */
export function appendCsvSync(
  filePath: string,
  data: ObjByString[],
): void {
  // Convert data to CSV rows
  const rows = data.map((row) => Object.values(row));

  // Build CSV content with proper escaping
  const csvContent = rows
    .map((row) => row.map(escapeCsvValue).join(','))
    .join('\n');

  // Append to file with leading newline
  appendFileSync(filePath, `\n${csvContent}`);
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
