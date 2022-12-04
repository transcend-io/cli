#!/usr/bin/env node

import yargs from 'yargs-parser';
import colors from 'colors';

import { logger } from './logger';
import { splitCsvToList, uploadPrivacyRequestsFromCsv } from './requests';

/**
 * Upload a CSV of Privacy Requests.
 *
 * Requirements:
 *
 * 1. Create API key with follow scopes: https://app.transcend.io/infrastructure/api-keys
 *    - "Submit New Data Subject Request"
 *    - "View Identity Verification Settings"
 *    - "View Global Attributes"
 * 2. Invite a new user into the dashboard with no scopes but email/password login (needed for diffie hellman channel)
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-request-upload.ts --auth=asd123 \
 *   --file=/Users/michaelfarrell/Desktop/test.csv \
 *   --skipFilterStep=true --isTest=true
 *
 * Standard usage:
 * yarn tr-request-upload --auth=asd123 \
 *   --file=/Users/michaelfarrell/Desktop/test.csv \
 *   --skipFilterStep=true --isTest=true
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    file = './requests.csv',
    transcendApiUrl = 'https://api.transcend.io',
    cacheFilepath = './transcend-privacy-requests-cache.json',
    auth,
    sombraAuth,
    concurrency = '20',
    isTest = 'false',
    isSilent = 'true',
    defaultPhoneCountryCode = '1', // USA
    emailIsVerified = 'true',
    clearDuplicateRequests = 'false',
    clearSuccessfulRequests = 'false',
    clearFailingRequests = 'false',
    dryRun = 'false',
    debug = 'false',
    skipFilterStep = 'false',
    attributes = 'Tags:transcend-cli',
  } = yargs(process.argv.slice(2)) as { [k in string]: string };

  // Ensure auth is passed
  if (!auth) {
    logger.error(
      colors.red(
        'A Transcend API key must be provided. You can specify using --auth=asd123',
      ),
    );
    process.exit(1);
  }

  // Upload privacy requests
  await uploadPrivacyRequestsFromCsv({
    cacheFilepath,
    file,
    auth,
    sombraAuth,
    clearFailingRequests: clearFailingRequests === 'true',
    concurrency: parseInt(concurrency, 10),
    transcendApiUrl,
    defaultPhoneCountryCode,
    attributes: splitCsvToList(attributes),
    clearDuplicateRequests: clearDuplicateRequests === 'true',
    clearSuccessfulRequests: clearSuccessfulRequests === 'true',
    debug: debug === 'true',
    skipFilterStep: skipFilterStep === 'true',
    isSilent: isSilent === 'true',
    emailIsVerified: emailIsVerified === 'true',
    isTest: isTest === 'true',
    dryRun: dryRun === 'true',
  });
}

main();
