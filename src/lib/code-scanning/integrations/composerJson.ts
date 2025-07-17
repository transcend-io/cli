import { readFileSync } from 'node:fs';
import path from 'node:path';
import { CodePackageSdk } from '../../../codecs';
import { CodeScanningConfig } from '../types';

export const composerJson: CodeScanningConfig = {
  supportedFiles: ['composer.json'],
  ignoreDirs: ['vendor', 'node_modules', 'cache', 'build', 'dist'],
  scanFunction: (filePath) => {
    const file = readFileSync(filePath, 'utf8');
    const directory = path.dirname(filePath);
    const asJson = JSON.parse(file);
    const {
      name,
      description,
      require: requireDependencies = {},
      'require-dev': requiredDevelopmentDependencies = {},
    } = asJson;
    return [
      {
        // name of the package
        name: name || directory.split('/').pop()!,
        description,
        softwareDevelopmentKits: [
          ...Object.entries(requireDependencies).map(
            ([name, version]): CodePackageSdk => ({
              name,
              version: typeof version === 'string' ? version : undefined,
            }),
          ),
          ...Object.entries(requiredDevelopmentDependencies).map(
            ([name, version]): CodePackageSdk => ({
              name,
              version: typeof version === 'string' ? version : undefined,
              isDevDependency: true,
            }),
          ),
        ],
      },
    ];
  },
};
