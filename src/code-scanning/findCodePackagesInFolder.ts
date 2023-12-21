import fastGlob from 'fast-glob';
import { CodePackageInput } from '../codecs';
import { getEntries } from '@transcend-io/type-utils';
import { CODE_SCANNING_CONFIGS } from './constants';
import { logger } from '../logger';

/**
 * Helper to scan and discovery all of the code packages within a folder
 *
 * @param options - Options
 * @returns the list of integrations
 */
export async function findCodePackagesInFolder({
  scanPath,
  ignoreDirs = [],
  repositoryName,
}: {
  /** The name of the github repository reporting packages for */
  repositoryName: string;
  /** Where to look for package.json files */
  scanPath: string;
  /** The directories to ignore (excludes node_modules and serverless-build) */
  ignoreDirs?: string[];
}): Promise<CodePackageInput[]> {
  const allCodePackages = await Promise.all(
    getEntries(CODE_SCANNING_CONFIGS).map(async ([codePackageType, config]) => {
      const {
        ignoreDirs: configIgnoreDirs,
        supportedFiles,
        scanFunction,
      } = config;
      const dirsToIgnore = [...ignoreDirs, ...configIgnoreDirs].filter(
        (dir) => dir.length > 0,
      );
      try {
        const filesToScan: string[] = await fastGlob(
          `${scanPath}/**/${supportedFiles.join('|')}`,
          {
            ignore: dirsToIgnore.map((dir: string) => `${scanPath}/**/${dir}`),
            unique: true,
            onlyFiles: true,
          },
        );
        logger.info(
          `Scanning: ${filesToScan.length} files of type ${codePackageType}`,
        );
        const allPackages = filesToScan
          .map((filePath) =>
            scanFunction(filePath).map((result) => ({
              ...result,
              relativePath: filePath.replace(`${scanPath}/`, ''),
            })),
          )
          .flat();
        logger.info(
          `Found: ${allPackages.length} packages and ${
            allPackages
              .map(
                ({ softwareDevelopmentKits = [] }) => softwareDevelopmentKits,
              )
              .flat().length
          } sdks`,
        );

        return allPackages.map(
          (pkg): CodePackageInput => ({
            ...pkg,
            type: codePackageType,
            repositoryName,
          }),
        );
      } catch (error) {
        throw new Error(
          `Error scanning globs ${supportedFiles} with error: ${error}`,
        );
      }
    }),
  );

  return allCodePackages.flat();
}
