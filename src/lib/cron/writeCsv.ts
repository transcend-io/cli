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
  headers: string[],
): void {
  const rows: string[][] = [];

  rows.push(headers);
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
export function appendCsvSync(filePath: string, data: ObjByString[]): void {
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
        .write(data, { headers, objectMode: true })
        .pipe(ws)
        .on('error', reject)
        .on('end', () => resolve(true));
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Parse a file path into a base name and extension
 *
 * @param filePath - File path to parse
 * @returns Base name and extension
 */
export function parseFilePath(filePath: string): {
  /** Base name of the file */
  baseName: string;
  /** Extension of the file */
  extension: string;
} {
  const lastDotIndex = filePath.lastIndexOf('.');
  return {
    baseName:
      lastDotIndex !== -1 ? filePath.substring(0, lastDotIndex) : filePath,
    extension: lastDotIndex !== -1 ? filePath.substring(lastDotIndex) : '.csv',
  };
}

/**
 * Write a large CSV dataset to multiple files to avoid file size limits
 *
 * @param filePath - Base file path (will be modified to include chunk numbers)
 * @param data - Data to write
 * @param headers - Headers
 * @param chunkSize - Maximum number of rows per file (default 100000)
 * @returns Array of written file paths
 */
export async function writeLargeCsv(
  filePath: string,
  data: ObjByString[],
  headers: boolean | string[] = true,
  chunkSize = 100000,
): Promise<string[]> {
  if (data.length <= chunkSize) {
    // If data is small enough, write to single file
    await writeCsv(filePath, data, headers);
    return [filePath];
  }

  // Split data into chunks and write to multiple files
  const writtenFiles: string[] = [];
  const totalChunks = Math.ceil(data.length / chunkSize);
  const { baseName, extension } = parseFilePath(filePath);

  for (let i = 0; i < totalChunks; i += 1) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, data.length);
    const chunk = data.slice(start, end);

    // Create filename with chunk number and zero-padding
    const chunkNumber = String(i + 1).padStart(String(totalChunks).length, '0');
    const chunkFilePath = `${baseName}_part${chunkNumber}_of_${totalChunks}${extension}`;

    await writeCsv(chunkFilePath, chunk, headers);
    writtenFiles.push(chunkFilePath);
  }

  return writtenFiles;
}
