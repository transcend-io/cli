import { readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * List the folders in a directory
 *
 * @param startDir - The base directory to list from
 * @returns The list of folders in that directory
 */
export function listDirectories(startDir: string): string[] {
  return readdirSync(startDir).filter((entryName) =>
    statSync(join(startDir, entryName)).isDirectory(),
  );
}
