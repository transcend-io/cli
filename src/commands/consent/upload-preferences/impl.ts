import type { LocalContext } from '../../../context';
import colors from 'colors';

import { logger } from '../../../logger';
import { uploadPreferenceManagementPreferencesInteractive } from '../../../lib/preference-management';
import { splitCsvToList } from '../../../lib/requests';
import { readdirSync } from 'fs';
import { map } from '../../../lib/bluebird-replace';
import { basename, join } from 'path';
import { doneInputValidation } from '../../../lib/cli/done-input-validation';

export interface UploadPreferencesCommandFlags {
  auth: string;
  partition: string;
  sombraAuth?: string;
  transcendUrl: string;
  file?: string;
  directory?: string;
  dryRun: boolean;
  skipExistingRecordCheck: boolean;
  receiptFileDir?: string;
  schemaFilePath?: string;
  skipWorkflowTriggers: boolean;
  forceTriggerWorkflows: boolean;
  skipConflictUpdates: boolean;
  isSilent: boolean;
  attributes: string;
  receiptFilepath: string;
  concurrency: number;
  allowedIdentifierNames: string[];
  identifierColumns: string[];
  columnsToIgnore?: string[];
}

/**
 * Get the file prefix from the file name
 *
 * @param file - The file name
 * @returns The file prefix
 */
function getFilePrefix(file: string): string {
  return basename(file).replace('.csv', '');
}

export async function uploadPreferences(
  this: LocalContext,
  {
    auth,
    partition,
    sombraAuth,
    transcendUrl,
    file = '',
    directory,
    dryRun,
    skipExistingRecordCheck,
    receiptFileDir,
    schemaFilePath,
    skipWorkflowTriggers,
    forceTriggerWorkflows,
    skipConflictUpdates,
    isSilent,
    attributes,
    concurrency,
    allowedIdentifierNames,
    identifierColumns,
    columnsToIgnore = [],
  }: UploadPreferencesCommandFlags,
): Promise<void> {
  if (!!directory && !!file) {
    logger.error(
      colors.red(
        'Cannot provide both a directory and a file. Please provide only one.',
      ),
    );
    this.process.exit(1);
  }

  if (!file && !directory) {
    logger.error(
      colors.red(
        'A file or directory must be provided. Please provide one using --file=./preferences.csv or --directory=./preferences',
      ),
    );
    this.process.exit(1);
  }

  doneInputValidation(this.process.exit);

  const files: string[] = [];

  if (directory) {
    try {
      const filesInDirectory = readdirSync(directory);
      const csvFiles = filesInDirectory.filter((file) => file.endsWith('.csv'));

      if (csvFiles.length === 0) {
        logger.error(
          colors.red(`No CSV files found in directory: ${directory}`),
        );
        this.process.exit(1);
      }

      // Add full paths for each CSV file
      files.push(...csvFiles.map((file) => join(directory, file)));
    } catch (err) {
      logger.error(colors.red(`Failed to read directory: ${directory}`));
      logger.error(colors.red((err as Error).message));
      this.process.exit(1);
    }
  } else {
    try {
      // Verify file exists and is a CSV
      if (!file.endsWith('.csv')) {
        logger.error(colors.red('File must be a CSV file'));
        this.process.exit(1);
      }
      files.push(file);
    } catch (err) {
      logger.error(colors.red(`Failed to access file: ${file}`));
      logger.error(colors.red((err as Error).message));
      this.process.exit(1);
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

  // Determine receipts folder
  const receiptsFolder =
    receiptFileDir ||
    (directory ? join(directory, '../receipts') : './receipts');

  // Determine the schema file
  const schemaFile =
    schemaFilePath ||
    (directory
      ? join(directory, '../preference-upload-schema.json')
      : `${getFilePrefix(files[0])}-preference-upload-schema.json`);

  // yarn ts-node ./src/cli-chunk-csv.ts --inputFile=$file
  // Create folder of 1200 chunks in ./working/costco/udp/all-chunks
  // Copy over 100 files from all-chunks -> pending-chunks
  // Run pnpm start consent upload-preferences --auth=$API_KEY --partition=448b3320-9d7c-499a-bc56-f0dae33c8f5c --directory=./working/costco/udp/pending-chunks --dryRun=false --skipWorkflowTriggers=true --skipExistingRecordCheck=true --isSilent=true --attributes="Tags:transcend-cli,Source:transcend-cli" --transcendUrl=https://api.us.transcend.io/ --allowedIdentifierNames="email,personID,memberID,transcendID,birthDate" --identifierColumns="email_address,person_id,member_id,transcendID,birth_dt" --columnsToIgnore="source_system,mktg_consent_ts" --sombraAuth=$SOMBRA_AUTH --concurrency=1
  // Writes each of 1200 files to ./receipts/<chunk-name>-receipts.json -> currently there are 300

  // FIXME auto splitting
  // FIXME: use single tenant sombra
  // FIXME add overview of status
  // FIXME handle re-processing of same file, and error handling

  await map(
    files,
    async (filePath) => {
      await uploadPreferenceManagementPreferencesInteractive({
        receiptFilepath: join(
          receiptsFolder,
          `${getFilePrefix(filePath)}-receipts.json`,
        ),
        schemaFilePath: schemaFile,
        auth,
        sombraAuth,
        file: filePath,
        partition,
        transcendUrl,
        skipConflictUpdates,
        skipWorkflowTriggers,
        skipExistingRecordCheck,
        isSilent,
        dryRun,
        attributes: splitCsvToList(attributes),
        forceTriggerWorkflows,
        allowedIdentifierNames,
        identifierColumns,
        columnsToIgnore,
      });
    },
    { concurrency },
  );
}
