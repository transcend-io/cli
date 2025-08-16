import { existsSync, readdirSync } from 'node:fs';

/**
 * List the files in a directory
 *
 * ```typescript
 * // The directory to search
 * const directory = '/User/test/transcend/my-app/app/containers';
 * // Returns ['test.js']
 * listFiles(directory);
 * ```
 *
 * @param directory - The directory to search
 * @param validExtensions - The list of valid extensions
 * @param removeExtensions - When true, remove the extensions from the listed files
 * @returns The list of files in the directory
 */
export function listFiles(
  directory: string,
  validExtensions?: string[],
  removeExtensions = false,
): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  const files = readdirSync(directory)
    .filter((fil) =>
      validExtensions
        ? validExtensions.filter((ext) => fil.endsWith(ext)).length
        : true,
    )
    .filter((fil) => fil.indexOf('.') > 0);

  return removeExtensions
    ? files.map((fil) => fil.replace(/\.[^/.]+$/, ''))
    : files;
}
