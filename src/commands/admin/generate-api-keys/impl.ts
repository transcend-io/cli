import type { LocalContext } from '../../../context';
import colors from 'colors';
import { writeFileSync } from 'fs';

import { ScopeName, TRANSCEND_SCOPES } from '@transcend-io/privacy-types';

import { logger } from '../../../logger';
import { generateCrossAccountApiKeys } from '../../../lib/api-keys';
import { keyBy } from 'lodash-es';
import { doneInputValidation } from '../../../lib/cli/done-input-validation';

const SCOPES_BY_TITLE = keyBy(
  Object.entries(TRANSCEND_SCOPES).map(([name, value]) => ({
    ...value,
    name,
  })),
  'title',
);
const SCOPE_TITLES = Object.keys(SCOPES_BY_TITLE);

// Command flag interface
export interface GenerateApiKeysCommandFlags {
  email: string;
  password: string;
  apiKeyTitle: string;
  file: string;
  scopes: string[];
  deleteExistingApiKey: boolean;
  createNewApiKey: boolean;
  parentOrganizationId?: string;
  transcendUrl: string;
}

// Command implementation
export async function generateApiKeys(
  this: LocalContext,
  {
    email,
    password,
    apiKeyTitle,
    file,
    scopes,
    deleteExistingApiKey,
    createNewApiKey,
    parentOrganizationId,
    transcendUrl,
  }: GenerateApiKeysCommandFlags,
): Promise<void> {
  // Validate scopes
  const splitScopes = scopes.map((x) => x.trim());
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

  doneInputValidation();

  const scopeNames = splitScopes.map(
    (scopeTitle) => SCOPES_BY_TITLE[scopeTitle].name as ScopeName,
  );

  // Upload privacy requests
  const { errors, apiKeys } = await generateCrossAccountApiKeys({
    transcendUrl,
    password,
    email,
    parentOrganizationId,
    deleteExistingApiKey,
    createNewApiKey,
    apiKeyTitle,
    scopes: scopeNames,
  });

  // Write to disk
  writeFileSync(file, `${JSON.stringify(apiKeys, null, 2)}\n`);
  if (errors.length > 0) {
    process.exit(1);
  }
}
