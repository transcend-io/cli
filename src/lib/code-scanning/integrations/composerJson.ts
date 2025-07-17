import { readFileSync } from 'fs';
import { dirname } from 'path';
import { CodePackageSdk } from '../../../codecs';
import { CodeScanningConfig } from '../types';

export const composerJson: CodeScanningConfig = {
  supportedFiles: ['composer.json'],
  ignoreDirs: ['vendor', 'node_modules', 'cache', 'build', 'dist'],
  scanFunction: (filePath) => {
    const file = readFileSync(filePath, 'utf-8');
    const directory = dirname(filePath);
    const asJson = JSON.parse(file);
    const {
      name,
      description,
      require: requireDependencies = {},
      'require-dev': requiredDevDependencies = {},
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
          ...Object.entries(requiredDevDependencies).map(
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
