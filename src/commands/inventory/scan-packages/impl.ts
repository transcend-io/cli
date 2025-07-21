import type { LocalContext } from '../../../context';
import { logger } from '../../../logger';
import colors from 'colors';
import { ADMIN_DASH } from '../../../constants';
import { findCodePackagesInFolder } from '../../../lib/code-scanning';
import {
  buildTranscendGraphQLClient,
  syncCodePackages,
} from '../../../lib/graphql';
import { execSync } from 'child_process';
import { doneInputValidation } from '../../../lib/cli/done-input-validation';

const REPO_ERROR =
  'A repository name must be provided. ' +
  'You can specify using --repositoryName=$REPO_NAME or by ensuring the ' +
  'command "git config --get remote.origin.url" returns the name of the repository';

export interface ScanPackagesCommandFlags {
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
  doneInputValidation();

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
