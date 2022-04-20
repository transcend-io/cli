import { readFileSync } from 'fs';

/**
 * Helper that will scan a package json and return a list of dependencies
 *
 * @param filePath - Path to load the package.json file
 * @returns a set of node dependencies
 */
export function scanPackageJson(filePath: string): string[] {
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
