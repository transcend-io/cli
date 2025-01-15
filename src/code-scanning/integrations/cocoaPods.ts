import { readFileSync } from 'fs';
import { CodeScanningConfig } from '../types';
import { CodePackageSdk } from '../../codecs';
import { findAllWithRegex } from '@transcend-io/type-utils';
import { CodePackageType } from '@transcend-io/privacy-types';

const POD_TARGET_REGEX = /target ('|")(.*?)('|")/;
const POD_PACKAGE_REGEX = /pod ('|")(.*?)('|")(, ('|")~> (.+?)('|")|)/;

export const cocoaPods: CodeScanningConfig = {
  supportedFiles: ['Podfile'],
  ignoreDirs: ['Pods'],
  scanFunction: (filePath) => {
    const fileContents = readFileSync(filePath, 'utf-8');

    const targets = findAllWithRegex(
      {
        value: new RegExp(POD_TARGET_REGEX, 'g'),
        matches: ['quote1', 'name', 'quote2'],
      },
      fileContents,
    );
    const packages = findAllWithRegex(
      {
        value: new RegExp(POD_PACKAGE_REGEX, 'g'),
        matches: [
          'quote1',
          'name',
          'quote2',
          'extra',
          'quote3',
          'version',
          'quote4',
        ],
      },
      fileContents,
    );

    const deps: CodePackageSdk[] = targets.map((target, ind) => ({
      name: target.name,
      type: CodePackageType.CocoaPods,
      softwareDevelopmentKits: packages
        .filter(
          (pkg) =>
            pkg.matchIndex > target.matchIndex &&
            (!targets[ind + 1] || pkg.matchIndex < targets[ind + 1].matchIndex),
        )
        .map((pkg) => ({
          name: pkg.name,
          version: pkg.version,
        })),
    }));

    return deps;
  },
};
