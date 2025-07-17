import { readFileSync } from 'node:fs';
import path from 'node:path';
import { CodePackageType } from '@transcend-io/privacy-types';
import { findAllWithRegex } from '@transcend-io/type-utils';
import { listFiles } from '../../api-keys';
import { CodeScanningConfig } from '../types';

const GEM_PACKAGE_REGEX = /gem *('|")(.+?)('|")(, *('|")(.+?)('|")|)/;
const GEMFILE_PACKAGE_NAME_REGEX = /spec\.name *= *('|")(.+?)('|")/;
const GEMFILE_PACKAGE_DESCRIPTION_REGEX =
  /spec\.description *= *('|")(.+?)('|")/;
const GEMFILE_PACKAGE_SUMMARY_REGEX = /spec\.summary *= *('|")(.+?)('|")/;

export const gemfile: CodeScanningConfig = {
  supportedFiles: ['Gemfile'],
  ignoreDirs: ['bin'],
  scanFunction: (filePath) => {
    const fileContents = readFileSync(filePath, 'utf-8');
    const directory = path.dirname(filePath);
    const filesInFolder = listFiles(directory);

    // parse gemspec file for name
    const gemspec = filesInFolder.find((file) => file === '.gemspec');
    const gemspecContents = gemspec
      ? readFileSync(gemspec, 'utf-8')
      : undefined;
    const gemfileName = gemspecContents
      ? (GEMFILE_PACKAGE_NAME_REGEX.exec(gemspecContents) || [])[2]
      : undefined;
    const gemfileDescription = gemspecContents
      ? (GEMFILE_PACKAGE_DESCRIPTION_REGEX.exec(gemspecContents) ||
          GEMFILE_PACKAGE_SUMMARY_REGEX.exec(gemspecContents) ||
          [])[1]
      : undefined;

    const targets = findAllWithRegex(
      {
        value: new RegExp(GEM_PACKAGE_REGEX, 'g'),
        matches: [
          'quote1',
          'name',
          'quote2',
          'hasVersion',
          'quote3',
          'version',
          'quote4',
        ],
      },
      fileContents,
    );

    return [
      {
        name: gemfileName || directory.split('/').pop()!,
        description: gemfileDescription || undefined,
        type: CodePackageType.RequirementsTxt,
        softwareDevelopmentKits: targets.map((package_) => ({
          name: package_.name,
          version: package_.version,
        })),
      },
    ];
  },
};
