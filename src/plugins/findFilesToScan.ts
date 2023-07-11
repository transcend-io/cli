import fastGlob from 'fast-glob';
import { logger } from '../logger';
import { SiloDiscoveryConfig, SiloDiscoveryRawResults } from './types';

/**
 * Helper to scan for data silos in all package.json files that it can find in a directory
 *
 * @param scanPath - Where to look for package.json files
 * @param fileGlobs - Globs to look for
 * @param ignoreDirs - The directories to ignore (excludes node_modules and serverless-build)
 * @param config - Silo Discovery configuration
 * @returns the list of integrations
 */
export const findFilesToScan = async (
  scanPath: string,
  fileGlobs: string,
  ignoreDirs: string,
  config: SiloDiscoveryConfig,
): Promise<SiloDiscoveryRawResults[]> => {
  const { ignoreDirs: IGNORE_DIRS, supportedFiles, scanFunction } = config;
  const globsToSupport =
    fileGlobs === ''
      ? supportedFiles
      : supportedFiles.concat(fileGlobs.split(','));
  const dirsToIgnore = [...ignoreDirs.split(','), ...IGNORE_DIRS].filter(
    (dir) => dir.length > 0,
  );
  try {
    const filesToScan: string[] = await fastGlob(
      `${scanPath}/**/${globsToSupport.join('|')}`,
      {
        ignore: dirsToIgnore.map((dir: string) => `${scanPath}/**/${dir}`),
        unique: true,
        onlyFiles: true,
      },
    );
    logger.info(`Scanning: ${filesToScan.length} files`);
    const allDeps = filesToScan
      .map((filePath: string) => scanFunction(filePath))
      .flat();
    const uniqueDeps = new Set(allDeps);
    const deps = [...uniqueDeps];
    logger.info(`Found: ${deps.length} unique dependencies`);
    return deps.map((dep) => ({
      name: dep.name,
      type: dep.type,
      resourceId: `${scanPath}/**/${dep.name}`,
      useStrictClassifier: true,
    }));
  } catch (error) {
    throw new Error(
      `Error scanning globs ${findFilesToScan} with error: ${error}`,
    );
  }
};
