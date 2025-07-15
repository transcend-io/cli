#!/usr/bin/env node

import yargs from 'yargs-parser';
import colors from 'colors';
import { writeFileSync } from 'fs';
import keyBy from 'lodash/keyBy';
import { ScopeName, TRANSCEND_SCOPES } from '@transcend-io/privacy-types';

import { logger } from '../logger';
import { generateCrossAccountApiKeys } from './api-keys';
import { DEFAULT_TRANSCEND_API } from '../constants';

const SCOPES_BY_TITLE = keyBy(
  Object.entries(TRANSCEND_SCOPES).map(([name, value]) => ({
    ...value,
    name,
  })),
  'title',
);
const SCOPE_TITLES = Object.keys(SCOPES_BY_TITLE);

/**
 * Create API keys with the same set of scopes across multiple Transcend instances
 *
 * Requires the username and password of user with access to multiple instances.
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-generate-cross-account-api-keys.ts --email=test@transcend.io --email=NE8pGp$s8Gm4Mzb5 \
 *   --apiKeyTitle="My Test Key" --scopes="View Email Templates,View Data Map" --file=./secrets.json
 *
 * Standard usage:
 * yarn tr-generate-api-keys --email=test@transcend.io --password=NE8pGp$s8Gm4Mzb5 \
 *   --apiKeyTitle="My Test Key" --scopes="View Email Templates,View Data Map" --file=./secrets.json
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    transcendUrl = DEFAULT_TRANSCEND_API,
    file,
    email,
    password,
    apiKeyTitle,
    scopes,
    parentOrganizationId,
    deleteExistingApiKey = 'true',
    createNewApiKey = 'true',
  } = yargs(process.argv.slice(2)) as { [k in string]: string };

  // Ensure file is passed
  if (!file) {
    logger.error(
      colors.red(
        'A file must be provided. You can specify using --file=./secrets.json',
      ),
    );
    process.exit(1);
  }

  // Ensure email is passed
  if (!email) {
    logger.error(
      colors.red(
        'An email must be provided. You can specify using --email=asd123@test.com',
      ),
    );
    process.exit(1);
  }

  // Ensure password is passed
  if (!password) {
    logger.error(
      colors.red(
        'A password must be provided. You can specify using --password=asd123',
      ),
    );
    process.exit(1);
  }

  // Ensure apiKeyTitle is passed
  if (!apiKeyTitle) {
    logger.error(
      colors.red(
        'An API key title must be provided. You can specify using --apiKeyTitle="My Title"',
      ),
    );
    process.exit(1);
  }

  // Ensure scopes is passed
  if (!scopes) {
    logger.error(
      colors.red(
        'Scopes must be provided. You can specify using --scopes="View Email Templates,View Data Map". ' +
          `Expected one of: \n${SCOPE_TITLES.join('\n')}`,
      ),
    );
    process.exit(1);
  }

  // Validate scopes
  const splitScopes = scopes.split(',').map((x) => x.trim());
  const invalidScopes = splitScopes.filter(
    (scopeTitle) => !SCOPES_BY_TITLE[scopeTitle],
  );
  if (invalidScopes.length > 0) {
    logger.error(
      colors.red(
        `Failed to parse scopes:"${invalidScopes.join(',')}".\n` +
          `Expected one of: \n${SCOPE_TITLES.join('\n')}`,
      ),
    );
    process.exit(1);
  }

  const scopeNames = splitScopes.map(
    (scopeTitle) => SCOPES_BY_TITLE[scopeTitle].name as ScopeName,
  );

  // Upload privacy requests
  const { errors, apiKeys } = await generateCrossAccountApiKeys({
    transcendUrl,
    password,
    email,
    parentOrganizationId,
    deleteExistingApiKey: deleteExistingApiKey !== 'false',
    createNewApiKey: createNewApiKey !== 'false',
    apiKeyTitle,
    scopes: scopeNames,
  });

  // Write to disk
  writeFileSync(file, `${JSON.stringify(apiKeys, null, 2)}\n`);
  if (errors.length > 0) {
    process.exit(1);
  }
}

main();
