import { readFileSync } from 'node:fs';

/**
 * Safely reads the contents of a file as a UTF-8 string.
 * Returns an empty string if the path is not provided or if reading fails.
 *
 * @param p - The path to the file to read.
 * @returns The file contents as a string, or an empty string on error.
 */
export function readSafe(p?: string): string {
  try {
    return p ? readFileSync(p, 'utf8') : '';
  } catch {
    return '';
  }
}
