import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * List the folders in a directory
 *
 * @param startDir - The base directory to list from
 * @returns The list of folders in that directory
 */
export function listDirectories(startDir: string): string[] {
  return readdirSync(startDir).filter((entryName) =>
    statSync(path.join(startDir, entryName)).isDirectory(),
  );
}
