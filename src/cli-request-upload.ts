#!/usr/bin/env node

import yargs from 'yargs-parser';
import colors from 'colors';

import { logger } from './logger';
import { splitCsvToList, uploadPrivacyRequestsFromCsv } from './requests';

/**
 * Upload a CSV of Privacy Requests.
 *
 * Requires an API key with follow scopes: https://app.transcend.io/infrastructure/api-keys
 *    - "Submit New Data Subject Request"
 *    - "View Identity Verification Settings"
 *    - "View Global Attributes"
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-request-upload.ts --auth=$TRANSCEND_API_KEY \
 *   --file=/Users/michaelfarrell/Desktop/test.csv \
 *   --skipFilterStep=true --isTest=true
 *
 * Standard usage:
 * yarn tr-request-upload --auth=$TRANSCEND_API_KEY \
 *   --file=/Users/michaelfarrell/Desktop/test.csv \
 *   --skipFilterStep=true --isTest=true
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    auth,
    file = './requests.csv',
    transcendUrl = 'https://api.transcend.io',
    cacheFilepath = './transcend-privacy-requests-cache.json',
    requestReceiptFolder = './privacy-request-upload-receipts',
    sombraAuth,
    concurrency = '100',
    isTest = 'false',
    isSilent = 'true',
    defaultPhoneCountryCode = '1', // USA
    emailIsVerified = 'true',
    dryRun = 'false',
    debug = 'false',
    skipFilterStep = 'false',
    attributes = 'Tags:transcend-cli',
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

  // Upload privacy requests
  await uploadPrivacyRequestsFromCsv({
    cacheFilepath,
    requestReceiptFolder,
    file,
    auth,
    sombraAuth,
    concurrency: parseInt(concurrency, 10),
    transcendUrl,
    defaultPhoneCountryCode,
    attributes: splitCsvToList(attributes),
    debug: debug === 'true',
    skipFilterStep: skipFilterStep === 'true',
    isSilent: isSilent === 'true',
    emailIsVerified: emailIsVerified === 'true',
    isTest: isTest === 'true',
    dryRun: dryRun === 'true',
  });
}

main();
