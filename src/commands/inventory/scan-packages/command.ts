import { buildCommand } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';
import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '../../../cli/common-parameters';

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
      packageName: {
        kind: 'parsed',
        parse: String,
        brief: 'Name of the git repository that the package should be tied to',
        optional: true,
      },
      transcendUrl: createTranscendUrlParameter(),
    },
  },
  docs: {
    brief: 'Scan packages',
    fullDescription: `Transcend can scan your codebase to inventory your code packages and dependencies.`,
  },
});
