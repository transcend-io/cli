#!/usr/bin/env node
import yargs from 'yargs-parser';
import { logger } from './logger';
import colors from 'colors';
import { ADMIN_DASH, DEFAULT_TRANSCEND_API } from './constants';
import { findCodePackagesInFolder } from './code-scanning';
import { buildTranscendGraphQLClient, syncCodePackages } from './graphql';
import { execSync } from 'child_process';
import { splitCsvToList } from './requests';

const REPO_ERROR =
  'A repository name must be provided. ' +
  'You can specify using --repositoryName=$REPO_NAME or by ensuring the ' +
  'command "git config --get remote.origin.url" returns the name of the repository';

/**
 * Scan a codebase to discovery new:
 * - codePackages
 * - softwareDevelopmentKits
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-scan-packages.ts --auth=$TRANSCEND_API_KEY \
 *   --scanPath=./ \
 *   --ignoreDirs=build_directories_to_ignore
 *
 * Standard usage
 * yarn tr-scan-packages --auth=$TRANSCEND_API_KE --scanPath=./
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    scanPath = '.',
    ignoreDirs = '',
    transcendUrl = DEFAULT_TRANSCEND_API,
    repositoryName,
    auth,
  } = yargs(process.argv.slice(2));

  // // Ensure auth is passed
  if (!auth) {
    logger.error(
      colors.red(
        'A Transcend API key must be provided. You can specify using --auth=$TRANSCEND_API_KEY',
      ),
    );
    process.exit(1);
  }

  // Ensure repository name is specified
  let gitRepositoryName = repositoryName;
  if (!gitRepositoryName) {
    try {
      const name = execSync(
        `cd ${scanPath} && git config --get remote.origin.url`,
      );
      // Trim and parse the URL
      const url = name.toString('utf-8').trim();
      [gitRepositoryName] = !url.includes('https:')
        ? (url.split(':').pop() || '').split('.')
        : url.split('/').slice(3).join('/').split('.');
      if (!gitRepositoryName) {
        logger.error(colors.red(REPO_ERROR));
        process.exit(1);
      }
    } catch (err) {
      logger.error(colors.red(`${REPO_ERROR} - Got error: ${err.message}`));
      process.exit(1);
    }
  }

  // Create a GraphQL client
  const client = buildTranscendGraphQLClient(transcendUrl, auth);

  // Scan the codebase to discovery packages
  const results = await findCodePackagesInFolder({
    scanPath,
    ignoreDirs: ignoreDirs ? splitCsvToList(ignoreDirs) : [],
    repositoryName: gitRepositoryName,
  });

  // Report scan to Transcend
  await syncCodePackages(client, results);

  const newUrl = new URL(ADMIN_DASH);
  newUrl.pathname = '/code-scanning/code-packages';

  // Indicate success
  logger.info(
    colors.green(
      `Scan found ${results.length} packages at ${scanPath}! ` +
        `View results at '${newUrl.href}'`,
    ),
  );
}

main();
