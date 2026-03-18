import type { LocalContext } from '../../../context';
import { listFiles } from '../../../lib/api-keys';
import { consentManagersToBusinessEntities as consentManagersToBusinessEntitiesHelper } from '../../../lib/consent-manager';
import {
  readTranscendYaml,
  writeTranscendYaml,
} from '../../../lib/readTranscendYaml';
import { join } from 'node:path';

import colors from 'colors';
import { logger } from '../../../logger';
import { existsSync, lstatSync } from 'node:fs';
import { doneInputValidation } from '../../../lib/cli/done-input-validation';

export interface ConsentManagersToBusinessEntitiesCommandFlags {
  consentManagerYmlFolder: string;
  output: string;
}

export function consentManagersToBusinessEntities(
  this: LocalContext,
  {
    consentManagerYmlFolder,
    output,
  }: ConsentManagersToBusinessEntitiesCommandFlags,
): void {
  doneInputValidation(this.process.exit);

  // Ensure folder is passed
  if (
    !existsSync(consentManagerYmlFolder) ||
    !lstatSync(consentManagerYmlFolder).isDirectory()
  ) {
    logger.error(
      colors.red(`Folder does not exist: "${consentManagerYmlFolder}"`),
    );
    this.process.exit(1);
  }

  // Read in each consent manager configuration
  const inputs = listFiles(consentManagerYmlFolder).map((directory) => {
    const { 'consent-manager': consentManager } = readTranscendYaml(
      join(consentManagerYmlFolder, directory),
    );
    return { name: directory, input: consentManager };
  });

  // Convert to business entities
  const businessEntities = consentManagersToBusinessEntitiesHelper(inputs);

  // write to disk
  writeTranscendYaml(output, {
    'business-entities': businessEntities,
  });

  logger.info(
    colors.green(
      `Successfully wrote ${businessEntities.length} business entities to file "${output}"`,
    ),
  );
}
