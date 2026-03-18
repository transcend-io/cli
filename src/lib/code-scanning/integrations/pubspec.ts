import { readFileSync } from 'node:fs';
import { CodeScanningConfig } from '../types';
import { CodePackageType } from '@transcend-io/privacy-types';
import yaml from 'js-yaml';
import { dirname } from 'node:path';

/**
 * Remove YAML comments from a string
 *
 * @param yamlString - YAML string
 * @returns String without comments
 */
function removeYAMLComments(yamlString: string): string {
  return yamlString
    .split('\n')
    .map((line) => {
      // Remove inline comments
      const commentIndex = line.indexOf('#');
      if (commentIndex > -1) {
        // Check if '#' is not inside a string
        if (
          !line.substring(0, commentIndex).includes('"') &&
          !line.substring(0, commentIndex).includes("'")
        ) {
          return line.substring(0, commentIndex).trim();
        }
      }
      return line;
    })
    .filter((line) => line.length > 0)
    .join('\n');
}

export const pubspec: CodeScanningConfig = {
  supportedFiles: ['pubspec.yml'],
  ignoreDirs: ['build'],
  scanFunction: (filePath) => {
    const directory = dirname(filePath);
    const fileContents = readFileSync(filePath, 'utf-8');
    const {
      name,
      description,
      dev_dependencies = {},
      dependencies = {},
    } = yaml.load(removeYAMLComments(fileContents)) as {
      /** Name */
      name?: string;
      /** Description */
      description?: string;
      /** Dev dependencies */
      dev_dependencies?: { [k in string]: number | Record<string, string> };
      /** Dependencies */
      dependencies?: { [k in string]: number | Record<string, string> };
    };
    return [
      {
        name: name || directory.split('/').pop()!,
        description,
        type: CodePackageType.RequirementsTxt,
        softwareDevelopmentKits: [
          ...Object.entries(dependencies).map(([name, version]) => ({
            name,
            version:
              typeof version === 'string'
                ? version
                : typeof version === 'number'
                ? version.toString()
                : version?.sdk,
          })),
          ...Object.entries(dev_dependencies).map(([name, version]) => ({
            name,
            version:
              typeof version === 'string'
                ? version
                : typeof version === 'number'
                ? version.toString()
                : version?.sdk,
            isDevDependency: true,
          })),
        ],
      },
    ];
  },
};
