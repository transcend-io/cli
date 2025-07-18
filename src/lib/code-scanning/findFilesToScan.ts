import fastGlob from 'fast-glob';
import { logger } from '../../logger';
import { CodeScanningConfig } from './types';

export interface SiloDiscoveryRawResults {
  /** The name of the potential data silo entry */
  name: string;
  /** A unique UUID (represents the same resource across different silo discovery runs) */
  resourceId: string;
  /** Any hosts associated with the entry */
  host?: string;
  /** Type of data silo */
  type?: string | undefined;
}

/**
 * Helper to scan for data silos in all package.json files that it can find in a directory
 *
 * @deprecated TODO: https://transcend.height.app/T-32325 - use code scanning instead
 * @param options - Options
 * @returns the list of integrations
 */
export async function findFilesToScan({
  scanPath,
  fileGlobs,
  ignoreDirs,
  config,
}: {
  /** Where to look for package.json files */
  scanPath: string;
  /** Globs to look for */
  fileGlobs: string;
  /** The directories to ignore (excludes node_modules and serverless-build) */
  ignoreDirs: string;
  /** Silo Discovery configuration */
  config: CodeScanningConfig;
}): Promise<SiloDiscoveryRawResults[]> {
  const { ignoreDirs: IGNORE_DIRS, supportedFiles, scanFunction } = config;
  const globsToSupport =
    fileGlobs === ''
      ? supportedFiles
      : supportedFiles.concat(fileGlobs.split(','));
  const directoriesToIgnore = [...ignoreDirs.split(','), ...IGNORE_DIRS].filter(
    (dir) => dir.length > 0,
  );
  try {
    const filesToScan: string[] = await fastGlob(
      `${scanPath}/**/${globsToSupport.join('|')}`,
      {
        ignore: directoriesToIgnore.map(
          (dir: string) => `${scanPath}/**/${dir}`,
        ),
        unique: true,
        onlyFiles: true,
      },
    );
    logger.info(`Scanning: ${filesToScan.length} files`);
    const allPackages = filesToScan.flatMap((filePath: string) =>
      scanFunction(filePath),
    );
    const allSdks = allPackages.flatMap(
      (appPackage) => appPackage.softwareDevelopmentKits || [],
    );
    const uniqueDeps = new Set(allSdks.map((sdk) => sdk.name));
    const deps = [...uniqueDeps];
    logger.info(`Found: ${deps.length} unique dependencies`);
    return deps.map((dep) => ({
      name: dep,
      resourceId: `${scanPath}/**/${dep}`,
      useStrictClassifier: true,
    }));
  } catch (error) {
    throw new Error(
      `Error scanning globs ${findFilesToScan} with error: ${error}`,
    );
  }
}
