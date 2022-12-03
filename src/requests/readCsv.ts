import type { Options } from 'csv-parse';
import parse from 'csv-parse/lib/sync';
import { readFileSync } from 'fs';
import * as t from 'io-ts';

import { decodeCodec } from '@transcend-io/type-utils';

/**
 * Read in a CSV and validate its shape
 *
 * @param pathToFile - Path to file
 * @param codec - The codec to validate against. This is the codec for individual, non-header, rows
 * @param options - CSV parse options
 * @returns The JSON data
 */
export function readCsv<T extends t.Any>(
  pathToFile: string,
  codec: T,
  options: Options = { columns: true },
): t.TypeOf<T>[] {
  const fileContent = parse(readFileSync(pathToFile, 'utf-8'), options);
  return decodeCodec(t.array(codec), fileContent);
}
