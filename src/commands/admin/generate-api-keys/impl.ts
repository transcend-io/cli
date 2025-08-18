import type { LocalContext } from '../../../context';
import { writeFileSync } from 'node:fs';

import { ScopeName } from '@transcend-io/privacy-types';

import { generateCrossAccountApiKeys } from '../../../lib/api-keys';
import { doneInputValidation } from '../../../lib/cli/done-input-validation';
import { SCOPES_BY_TITLE } from '../../../constants';

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
  doneInputValidation(this.process.exit);

  const scopeNames = scopes.map(
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
    this.process.exit(1);
  }
}
