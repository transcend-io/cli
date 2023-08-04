#!/usr/bin/env/node
import { listFiles } from './api-keys';
import { consentManagersToBusinessEntities } from './consent-manager';
import { readTranscendYaml, writeTranscendYaml } from './readTranscendYaml';
import { join } from 'path';
import yargs from 'yargs-parser';
import colors from 'colors';
import { logger } from './logger';
import { existsSync, lstatSync } from 'fs';

/**
 * Combines folder of consent manager `transcend.yml` files into a single `transcend.yml` file
 * where each consent manager configuration is created as a business entity.
 *
 * yarn ts-node ./src/cli-consent-managers-to-business-entities.ts \
 *   --consentManagerYmlFolder=./working/consent-managers/ \
 *   --output=./combined-business-entities.yml
 *
 * Standard usage:
 * yarn tr-consent-managers-to-business-entities \
 *   --consentManagerYmlFolder=./working/consent-managers/ \
 *   --output=./combined-business-entities.yml
 */
function main(): void {
  // Parse command line arguments
  const {
    consentManagerYmlFolder,
    output = './combined-business-entities.yml',
  } = yargs(process.argv.slice(2)) as { [k in string]: string };

  // Ensure folder is passed to consentManagerYmlFolder
  if (!consentManagerYmlFolder) {
    logger.error(
      colors.red(
        'Missing required arg: --consentManagerYmlFolder=./working/consent-managers/',
      ),
    );
    process.exit(1);
  }

  // Ensure file is passed
  if (
    !existsSync(consentManagerYmlFolder) ||
    !lstatSync(consentManagerYmlFolder).isDirectory()
  ) {
    logger.error(
      colors.red(`Folder does not exist: "${consentManagerYmlFolder}"`),
    );
    process.exit(1);
  }

  // Read in each consent manager configuration
  const inputs = listFiles(consentManagerYmlFolder).map((directory) => {
    const { 'consent-manager': consentManager } = readTranscendYaml(
      join(consentManagerYmlFolder, directory),
    );
    return { name: directory, input: consentManager };
  });

  // Convert to business entities
  const businessEntities = consentManagersToBusinessEntities(inputs);

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

main();
