import { readFileSync } from 'fs';

import fastGlob from 'fast-glob';
import { SiloDiscoveryRawResults } from './types';

const SUPPORTED_FILE_SCANS = ['package.json'];
const IGNORE_DIRS = ['node_modules', 'serverless-build', 'lambda-build'];

/**
 * Helper that will scan a package json and return a list of dependencies
 *
 * @param filePath - Path to load the package.json file
 * @returns a set of node dependencies
 */
function scanOneFile(filePath: string): string[] {
  const file = readFileSync(filePath, 'utf-8');
  const asJson = JSON.parse(file);
  const {
    dependencies = {},
    devDependencies = {},
    optionalDependencies = {},
  } = asJson;
  return [
    ...Object.keys(dependencies),
    ...Object.keys(devDependencies),
    ...Object.keys(optionalDependencies),
  ];
}

/**
 * Helper to scan for data silos in all package.json files that it can find in a directory
 *
 * @param scanPath - Where to look for package.json files
 * @param ignoreDirs - The directories to ignore (excludes node_modules and serverless-build)
 * @returns the list of integrations
 */
export async function scanPackageJson(
  scanPath: string,
  ignoreDirs: string,
): Promise<SiloDiscoveryRawResults[]> {
  const dirsToIgnore = [...IGNORE_DIRS, ...ignoreDirs.split(',')].filter(
    (dir) => dir.length > 0,
  );
  const filesToScan: string[] = await fastGlob(
    `${scanPath}/**/${SUPPORTED_FILE_SCANS.join('|')}`,
    {
      ignore: dirsToIgnore.map((dir: string) => `${scanPath}/**/${dir}`),
      unique: true,
      onlyFiles: true,
    },
  );
  const allDeps = filesToScan
    .map((filePath: string) => scanOneFile(filePath))
    .flat();
  const uniqueDeps = new Set(allDeps);
  return [...uniqueDeps].map((dep) => ({
    name: dep,
    resourceId: `${scanPath}/**/${dep}`,
  }));
}
