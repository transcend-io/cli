#!/usr/bin/env node
// TODO DELETE
import yargs from 'yargs-parser';
import colors from 'colors';

import { logger } from '../logger';
import { DEFAULT_TRANSCEND_API } from '../constants';
import { uploadPreferenceManagementPreferencesInteractive } from './preference-management';
import { splitCsvToList } from './requests';
import { readdirSync } from 'fs';
import { map } from './bluebird-replace';
import { basename, join } from 'path';

/**
 * Upload consent preferences to the managed consent database
 *
 * Requires following documentation found at:
 * https://docs.transcend.io/docs/consent/reference/managed-consent-database
 *
 * Dev Usage:
 * pnpm exec tsx ./src/cli-upload-preferences --base64EncryptionKey=$TRANSCEND_CONSENT_ENCRYPTION_KEY \
 *  --base64SigningKey=$TRANSCEND_CONSENT_SIGNING_KEY --partition=4d1c5daa-90b7-4d18-aa40-f86a43d2c726
 *
 * Standard usage:
 * yarn tr-upload-preferences --base64EncryptionKey=$TRANSCEND_CONSENT_ENCRYPTION_KEY \
 *  --base64SigningKey=$TRANSCEND_CONSENT_SIGNING_KEY --partition=4d1c5daa-90b7-4d18-aa40-f86a43d2c726
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    /** Directory to load preferences from */
    directory,
    /** File to load preferences from */
    file,
    /** Transcend URL */
    transcendUrl = DEFAULT_TRANSCEND_API,
    /** API key */
    auth,
    /** Sombra API key */
    sombraAuth,
    /** Partition key to load into */
    partition,
    /** Whether to do a dry run */
    dryRun = 'false',
    /** Whether to skip workflow triggers */
    skipWorkflowTriggers = 'false',
    /** Whether to force trigger workflows */
    forceTriggerWorkflows = 'false',
    /** Whether to skip conflict updates */
    skipConflictUpdates = 'false',
    /** Whether to skip the check for existing records. SHOULD ONLY BE USED FOR INITIAL UPLOAD */
    skipExistingRecordCheck = 'false',
    /** Whether to skip sending emails */
    isSilent = 'true',
    /** Attributes to add to any DSR request if created */
    attributes = 'Tags:transcend-cli,Source:transcend-cli',
    /** Store resulting, continuing where left off  */
    receiptFileDir = './receipts',
    /** Number of files to process concurrently (only relevant for directory processing) */
    concurrency = '10',
  } = yargs(process.argv.slice(2)) as { [k in string]: string };

  // Ensure auth is passed
  if (!auth) {
    logger.error(
      colors.red(
        'A Transcend API key must be provided. You can specify using --auth=$TRANSCEND_API_KEY',
      ),
    );
    process.exit(1);
  }

  // Ensure partition
  if (!partition) {
    logger.error(
      colors.red(
        'A partition must be provided. ' +
          'You can specify using --partition=ee1a0845-694e-4820-9d51-50c7d0a23467',
      ),
    );
    process.exit(1);
  }

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
        // eslint-disable-next-line max-len
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

  if (skipExistingRecordCheck !== 'false') {
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
        transcendUrl,
        skipConflictUpdates: skipConflictUpdates !== 'false',
        skipWorkflowTriggers: skipWorkflowTriggers !== 'false',
        skipExistingRecordCheck: skipExistingRecordCheck !== 'false',
        isSilent: isSilent !== 'false',
        dryRun: dryRun !== 'false',
        attributes: splitCsvToList(attributes),
        forceTriggerWorkflows: forceTriggerWorkflows !== 'false',
      });
    },
    { concurrency: parseInt(concurrency, 10) },
  );
}

main();
