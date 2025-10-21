import * as fastcsv from 'fast-csv';
import { createWriteStream, writeFileSync, appendFileSync } from 'node:fs';

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
  await new Promise<void>((resolve, reject) => {
    try {
      const stream = fastcsv
        .write(data, { headers, objectMode: true })
        .on('error', reject);

      ws.on('error', reject);
      ws.on('finish', () => resolve());

      stream.pipe(ws);
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
 * Convert an object row into values aligned to header order
 *
 * @param row - Row object
 * @param headerOrder - Header order
 * @returns Aligned row object
 */
function rowToValues(
  row: ObjByString,
  headerOrder: string[],
): Record<string, unknown> {
  // fast-csv with objectMode expects objects; we ensure consistent key ordering
  // by building a new object with keys in headerOrder.
  const ordered: Record<string, unknown> = {};
  for (const key of headerOrder) {
    // Preserve undefined -> becomes empty cell in CSV
    ordered[key] = row[key];
  }
  return ordered;
}

/**
 * Await the 'drain' event when backpressure indicates buffering
 *
 * @param stream - Writable stream
 * @returns Promise that resolves on 'drain'
 */
function waitForDrain(stream: NodeJS.WritableStream): Promise<void> {
  return new Promise((resolve) => {
    stream.once('drain', resolve);
  });
}

/**
 * Stream a large CSV dataset to a single file with proper backpressure handling.
 *
 * @param filePath - File to write out to
 * @param data - Data to write (iterated without buffering the entire file content)
 * @param headers - If true, infer from first row; if string[], use provided; if false, omit header row
 * @returns Array with a single written file path
 */
export async function writeLargeCsv(
  filePath: string,
  data: ObjByString[],
  headers: boolean | string[] = true,
): Promise<string[]> {
  // Determine header order
  let headerOrder: string[] | false;
  if (Array.isArray(headers)) {
    headerOrder = headers;
  } else if (headers === true) {
    headerOrder = data.length > 0 ? Object.keys(data[0]) : [];
  } else {
    headerOrder = false;
  }

  const ws = createWriteStream(filePath);
  const csvStream = fastcsv.format<ObjByString, ObjByString>({
    headers: headerOrder || undefined,
    objectMode: true,
  });

  // Pipe CSV stream into file write stream
  const piping = csvStream.pipe(ws);

  const completion = new Promise<void>((resolve, reject) => {
    piping.on('finish', () => resolve());
    piping.on('error', reject);
    csvStream.on('error', reject);
    ws.on('error', reject);
  });

  // Stream rows with backpressure handling
  for (const row of data) {
    const toWrite = headerOrder ? rowToValues(row, headerOrder) : row;
    const ok = csvStream.write(toWrite);
    if (!ok) {
      // Respect backpressure: wait until the internal buffer drains
      await waitForDrain(csvStream);
    }
  }

  // Signal end of input and wait for finish
  csvStream.end();
  await completion;

  return [filePath];
}
