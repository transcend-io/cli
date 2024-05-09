#!/usr/bin/env node

import yargs from 'yargs-parser';
import colors from 'colors';

import { logger } from './logger';
import { DEFAULT_TRANSCEND_CONSENT_API } from './constants';
import { uploadConsentPreferences } from './consent-manager/uploadConsentPreferences';
import { ConsentPreferenceUpload } from './consent-manager/types';
import { readCsv } from './requests';

/**
 * Upload consent preferences to the managed consent database
 *
 * Requires following documentation found at:
 * https://docs.transcend.io/docs/consent/reference/managed-consent-database
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-upload-consent-preferences.ts --base64EncryptionKey=$TRANSCEND_CONSENT_ENCRYPTION_KEY \
 *  --base64SigningKey=$TRANSCEND_CONSENT_SIGNING_KEY --partition=4d1c5daa-90b7-4d18-aa40-f86a43d2c726
 *
 * Standard usage:
 * yarn tr-upload-consent-preferences --base64EncryptionKey=$TRANSCEND_CONSENT_ENCRYPTION_KEY \
 *  --base64SigningKey=$TRANSCEND_CONSENT_SIGNING_KEY --partition=4d1c5daa-90b7-4d18-aa40-f86a43d2c726
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    /** File to load preferences from */
    file = 'preferences.csv',
    /** Transcend URL */
    transcendUrl = DEFAULT_TRANSCEND_CONSENT_API,
    /** base64 encryption key */
    base64EncryptionKey,
    /** base64 signing key */
    base64SigningKey,
    /** Partition key to load into */
    partition,
    /** Concurrency */
    concurrency = '100',
  } = yargs(process.argv.slice(2)) as { [k in string]: string };

  // Ensure auth is passed
  if (!base64EncryptionKey) {
    logger.error(
      colors.red(
        'A base64EncryptionKey must be provided. ' +
          'You can specify using --base64EncryptionKey=$TRANSCEND_CONSENT_ENCRYPTION_KEY',
      ),
    );
    process.exit(1);
  }
  if (!base64SigningKey) {
    logger.error(
      colors.red(
        'A base64SigningKey must be provided. ' +
          'You can specify using --base64SigningKey=$TRANSCEND_CONSENT_SIGNING_KEY',
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

  // Load in preferences from csv
  const preferences = readCsv(file, ConsentPreferenceUpload);

  // Upload cookies
  await uploadConsentPreferences({
    base64EncryptionKey,
    base64SigningKey,
    preferences,
    partition,
    concurrency: parseInt(concurrency, 10),
    transcendUrl,
  });
}

main();
