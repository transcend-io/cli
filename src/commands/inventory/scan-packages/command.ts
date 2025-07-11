import { buildCommand } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';
import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '@/cli/common-parameters';

export const scanPackagesCommand = buildCommand({
  loader: async () => {
    const { scanPackages } = await import('./impl');
    return scanPackages;
  },
  parameters: {
    flags: {
      auth: createAuthParameter({
        scopes: [ScopeName.ManageCodeScanning],
      }),
      scanPath: {
        kind: 'parsed',
        parse: String,
        brief: 'File path in the project to scan',
        default: './',
      },
      ignoreDirs: {
        kind: 'parsed',
        parse: String,
        variadic: ',',
        brief: 'List of directories to ignore in scan',
        optional: true,
      },
      repositoryName: {
        kind: 'parsed',
        parse: String,
        brief: 'Name of the git repository that the package should be tied to',
        optional: true,
      },
      transcendUrl: createTranscendUrlParameter(),
    },
  },
  docs: {
    brief: 'Scan dependency management files to inventory code dependencies.',
    fullDescription: `Transcend scans packages and dependencies for the following frameworks:

- package.json
- requirements.txt & setup.py
- Podfile
- Package.resolved
- build.gradle
- pubspec.yaml
- Gemfile & .gemspec
- composer.json

This command will scan the folder you point at to look for any of these files. Once found, the build file will be parsed in search of dependencies. Those code packages and dependencies will be uploaded to Transcend. The information uploaded to Transcend is:

- repository name
- package names
- dependency names and versions
- package descriptions`,
  },
});
