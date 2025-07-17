import { readFileSync } from 'fs';
import { decodeCodec } from '@transcend-io/type-utils';
import type { Options } from 'csv-parse';
import { parse } from 'csv-parse/sync';
import * as t from 'io-ts';

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
  // read file contents and parse
  const fileContent = parse(readFileSync(pathToFile, 'utf-8'), options);

  // validate codec
  const data = decodeCodec(t.array(codec), fileContent);

  // remove any special characters from object keys
  const parsed = data.map((datum) =>
    Object.entries(datum).reduce(
      (acc, [key, value]) =>
        Object.assign(acc, {
          [key.replace(/[^a-z_.+\-A-Z -~]/g, '')]: value,
        }),
      {} as T,
    ),
  );
  return parsed;
}
