import type { LocalContext } from '@/context';
import colors from 'colors';

import { logger } from '@/logger';
import { uploadPreferenceManagementPreferencesInteractive } from '@/lib/preference-management';
import { splitCsvToList } from '@/lib/requests';
import { readdirSync } from 'fs';
import { map } from '@/lib/bluebird-replace';
import { basename, join } from 'path';

interface UploadPreferencesCommandFlags {
  auth: string;
  partition: string;
  sombraAuth?: string;
  consentUrl: string;
  file?: string;
  directory?: string;
  dryRun: boolean;
  skipExistingRecordCheck: boolean;
  receiptFileDir: string;
  skipWorkflowTriggers: boolean;
  forceTriggerWorkflows: boolean;
  skipConflictUpdates: boolean;
  isSilent: boolean;
  attributes: string;
  receiptFilepath: string;
  concurrency: number;
}

export async function uploadPreferences(
  this: LocalContext,
  {
    auth,
    partition,
    sombraAuth,
    consentUrl,
    file = '',
    directory,
    dryRun,
    skipExistingRecordCheck,
    receiptFileDir,
    skipWorkflowTriggers,
    forceTriggerWorkflows,
    skipConflictUpdates,
    isSilent,
    attributes,
    concurrency,
  }: UploadPreferencesCommandFlags,
): Promise<void> {
  if (!!directory && !!file) {
    logger.error(
      colors.red(
        'Cannot provide both a directory and a file. Please provide only one.',
      ),
    );
    process.exit(1);
  }

  if (!file && !directory) {
    logger.error(
      colors.red(
        'A file or directory must be provided. Please provide one using --file=./preferences.csv or --directory=./preferences',
      ),
    );
    process.exit(1);
  }

  const files: string[] = [];

  if (directory) {
    try {
      const filesInDirectory = readdirSync(directory);
      const csvFiles = filesInDirectory.filter((file) => file.endsWith('.csv'));

      if (csvFiles.length === 0) {
        logger.error(
          colors.red(`No CSV files found in directory: ${directory}`),
        );
        process.exit(1);
      }

      // Add full paths for each CSV file
      files.push(...csvFiles.map((file) => join(directory, file)));
    } catch (err) {
      logger.error(colors.red(`Failed to read directory: ${directory}`));
      logger.error(colors.red((err as Error).message));
      process.exit(1);
    }
  } else {
    try {
      // Verify file exists and is a CSV
      if (!file.endsWith('.csv')) {
        logger.error(colors.red('File must be a CSV file'));
        process.exit(1);
      }
      files.push(file);
    } catch (err) {
      logger.error(colors.red(`Failed to access file: ${file}`));
      logger.error(colors.red((err as Error).message));
      process.exit(1);
    }
  }

  logger.info(
    colors.green(
      `Processing ${files.length} consent preferences files for partition: ${partition}`,
    ),
  );
  logger.debug(`Files to process: ${files.join(', ')}`);

  if (skipExistingRecordCheck) {
    logger.info(
      colors.bgYellow(
        `Skipping existing record check: ${skipExistingRecordCheck}`,
      ),
    );
  }

  await map(
    files,
    async (filePath) => {
      const fileName = basename(filePath).replace('.csv', '');
      await uploadPreferenceManagementPreferencesInteractive({
        receiptFilepath: join(receiptFileDir, `${fileName}-receipts.json`),
        auth,
        sombraAuth,
        file: filePath,
        partition,
        transcendUrl: consentUrl,
        skipConflictUpdates,
        skipWorkflowTriggers,
        skipExistingRecordCheck,
        isSilent,
        dryRun,
        attributes: splitCsvToList(attributes),
        forceTriggerWorkflows,
      });
    },
    { concurrency },
  );
}
