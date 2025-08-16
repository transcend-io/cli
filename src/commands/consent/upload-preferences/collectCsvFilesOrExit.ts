import { logger } from '../../../logger';
import { join } from 'path';
import { readdirSync } from 'fs';
import colors from 'colors';
import type { LocalContext } from '../../../context';

/**
 * Validate flags and collect CSV file paths from a directory or single file.
 * On validation error, the provided `exit` function is called.
 *
 * @param directory - the directory containing CSV files, or undefined if a single file is provided
 * @param file - the path to a single CSV file, or undefined if a directory is provided
 * @param localContext - the context of the command, used for logging and exit
 * @returns an array of valid CSV file paths
 */
export function collectCsvFilesOrExit(
  directory: string | undefined,
  file: string | undefined,
  localContext: LocalContext,
): string[] {
  const files: string[] = [];

  // Mutually exclusive inputs.
  if (!!directory && !!file) {
    logger.error(
      colors.red(
        'Cannot provide both a directory and a file. Please provide only one.',
      ),
    );
    localContext.process.exit(1);
  }

  // At least one must be present.
  if (!file && !directory) {
    logger.error(
      colors.red(
        'A file or directory must be provided. Use --file=./preferences.csv or --directory=./preferences',
      ),
    );
    localContext.process.exit(1);
  }

  if (directory) {
    // Collect all CSVs under directory.
    try {
      const csvFiles = readdirSync(directory).filter((f) => f.endsWith('.csv'));
      if (csvFiles.length === 0) {
        logger.error(
          colors.red(`No CSV files found in directory: ${directory}`),
        );
        localContext.process.exit(1);
      }
      files.push(...csvFiles.map((f) => join(directory, f)));
    } catch (err) {
      logger.error(colors.red(`Failed to read directory: ${directory}`));
      logger.error(colors.red((err as Error).message));
      localContext.process.exit(1);
    }
  } else if (file) {
    // Single-file mode; ensure it's CSV.
    try {
      if (!file.endsWith('.csv')) {
        logger.error(colors.red('File must be a CSV file'));
        localContext.process.exit(1);
      }
      files.push(file);
    } catch (err) {
      logger.error(colors.red(`Failed to access file: ${file}`));
      logger.error(colors.red((err as Error).message));
      localContext.process.exit(1);
    }
  }

  return files;
}
