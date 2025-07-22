import { getEntries } from '@transcend-io/type-utils';
import colors from 'colors';
import fastGlob from 'fast-glob';
import { CodePackageInput } from '../../codecs';
import { logger } from '../../logger';
import { CODE_SCANNING_CONFIGS } from './constants';

/**
 * Helper to scan and discovery all of the code packages within a folder
 *
 * @param options - Options
 * @returns the list of integrations
 */
export async function findCodePackagesInFolder({
  scanPath,
  ignoreDirs: ignoreDirectories = [],
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
        ignoreDirs: configIgnoreDirectories,
        supportedFiles,
        scanFunction,
      } = config;
      const directoriesToIgnore = [
        ...ignoreDirectories,
        ...configIgnoreDirectories,
      ].filter((dir) => dir.length > 0);
      try {
        const filesToScan: string[] = await fastGlob(
          `${scanPath}/**/${supportedFiles.join('|')}`,
          {
            ignore: directoriesToIgnore.map(
              (dir: string) => `${scanPath}/**/${dir}`,
            ),
            unique: true,
            onlyFiles: true,
          },
        );
        logger.info(
          colors.magenta(
            `Scanning: ${filesToScan.length} files of type ${codePackageType}`,
          ),
        );
        const allPackages = filesToScan.flatMap((filePath) =>
          scanFunction(filePath).map((result) => ({
            ...result,
            relativePath: filePath.replace(`${scanPath}/`, ''),
          })),
        );
        logger.info(
          colors.green(
            `Found: ${allPackages.length} packages and ${
              allPackages.flatMap(
                ({ softwareDevelopmentKits = [] }) => softwareDevelopmentKits,
              ).length
            } sdks`,
          ),
        );

        return allPackages.map(
          (package_): CodePackageInput => ({
            ...package_,
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
