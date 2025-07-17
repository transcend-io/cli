import { execSync } from 'node:child_process';
import colors from 'colors';
import { ADMIN_DASH } from '../../../constants';
import type { LocalContext } from '../../../context';
import { findCodePackagesInFolder } from '../../../lib/code-scanning';
import {
  buildTranscendGraphQLClient,
  syncCodePackages,
} from '../../../lib/graphql';
import { logger } from '../../../logger';

const REPO_ERROR =
  'A repository name must be provided. ' +
  'You can specify using --repositoryName=$REPO_NAME or by ensuring the ' +
  'command "git config --get remote.origin.url" returns the name of the repository';

interface ScanPackagesCommandFlags {
  auth: string;
  scanPath: string;
  ignoreDirs?: string[];
  repositoryName?: string;
  transcendUrl: string;
}

export async function scanPackages(
  this: LocalContext,
  {
    auth,
    scanPath,
    ignoreDirs,
    repositoryName,
    transcendUrl,
  }: ScanPackagesCommandFlags,
): Promise<void> {
  // Ensure repository name is specified
  let gitRepositoryName = repositoryName;
  if (!gitRepositoryName) {
    try {
      const name = execSync(
        `cd ${scanPath} && git config --get remote.origin.url`,
      );
      // Trim and parse the URL
      const url = name.toString('utf8').trim();
      [gitRepositoryName] = url.includes('https:')
        ? url.split('/').slice(3).join('/').split('.')
        : (url.split(':').pop() || '').split('.');
      if (!gitRepositoryName) {
        logger.error(colors.red(REPO_ERROR));
        process.exit(1);
      }
    } catch (error) {
      logger.error(colors.red(`${REPO_ERROR} - Got error: ${error.message}`));
      process.exit(1);
    }
  }

  // Create a GraphQL client
  const client = buildTranscendGraphQLClient(transcendUrl, auth);

  // Scan the codebase to discovery packages
  const results = await findCodePackagesInFolder({
    scanPath,
    ignoreDirs,
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
