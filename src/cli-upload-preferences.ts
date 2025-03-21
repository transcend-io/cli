#!/usr/bin/env node

import yargs from 'yargs-parser';
import colors from 'colors';

import { logger } from './logger';
import { DEFAULT_TRANSCEND_API } from './constants';
import { uploadPreferenceManagementPreferencesInteractive } from './preference-management';
import { splitCsvToList } from './requests';

/**
 * Upload consent preferences to the managed consent database
 *
 * Requires following documentation found at:
 * https://docs.transcend.io/docs/consent/reference/managed-consent-database
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-upload-consent-preferences-interactive --base64EncryptionKey=$TRANSCEND_CONSENT_ENCRYPTION_KEY \
 *  --base64SigningKey=$TRANSCEND_CONSENT_SIGNING_KEY --partition=4d1c5daa-90b7-4d18-aa40-f86a43d2c726
 *
 * Standard usage:
 * yarn tr-upload-consent-preferences-interactive --base64EncryptionKey=$TRANSCEND_CONSENT_ENCRYPTION_KEY \
 *  --base64SigningKey=$TRANSCEND_CONSENT_SIGNING_KEY --partition=4d1c5daa-90b7-4d18-aa40-f86a43d2c726
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    /** File to load preferences from */
    file = './preferences.csv',
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
    /** Whether to skip conflict updates */
    skipConflictUpdates = 'false',
    /** Whether to skip sending emails */
    isSilent = 'true',
    /** Attributes to add to any DSR request if created */
    attributes = 'Tags:transcend-cli,Source:transcend-cli',
    /** Store resulting, continuing where left off  */
    receiptFilepath = './preference-management-upload-receipts.json',
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

  // Upload cookies
  await uploadPreferenceManagementPreferencesInteractive({
    receiptFilepath,
    auth,
    sombraAuth,
    file,
    partition,
    transcendUrl,
    skipConflictUpdates: skipConflictUpdates !== 'false',
    skipWorkflowTriggers: skipWorkflowTriggers !== 'false',
    isSilent: isSilent !== 'false',
    dryRun: dryRun !== 'false',
    attributes: splitCsvToList(attributes),
  });
}

main();
