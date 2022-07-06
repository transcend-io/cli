import { SiloDiscoveryConfig, SiloDiscoveryRawResults } from '.';

/**
 * Helper to scan for data silos in all package.json files that it can find in a directory
 *
 * @param scanPath - Where to look for package.json files
 * @param ignoreDirs - The directories to ignore (excludes node_modules and serverless-build)
 * @returns the list of integrations
 */
export const findFilesToScan = async (
  scanPath: string,
  { ignoreDirs, supportedFiles, scanFunction }: SiloDiscoveryConfig,
): Promise<SiloDiscoveryRawResults[]> => {
  const dirsToIgnore = [...ignoreDirs.split(',')].filter(
    (dir) => dir.length > 0,
  );
  const filesToScan: string[] = await fastGlob(
    `${scanPath}/**/${supportedFiles.join('|')}`,
    {
      ignore: dirsToIgnore.map((dir: string) => `${scanPath}/**/${dir}`),
      unique: true,
      onlyFiles: true,
    },
  );
  const allDeps = filesToScan
    .map((filePath: string) => scanFunction(filePath))
    .flat();
  const uniqueDeps = new Set(allDeps);
  return [...uniqueDeps].map((dep) => ({
    name: dep,
    resourceId: `${scanPath}/**/${dep}`,
  }));
};
