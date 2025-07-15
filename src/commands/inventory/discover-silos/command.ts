import { buildCommand } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';
import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '@/lib/cli/common-parameters';
import { uuidParser } from '@/lib/cli/parsers';

export const discoverSilosCommand = buildCommand({
  loader: async () => {
    const { discoverSilos } = await import('./impl');
    return discoverSilos;
  },
  parameters: {
    flags: {
      scanPath: {
        kind: 'parsed',
        parse: String,
        brief: 'File path in the project to scan',
      },
      dataSiloId: {
        kind: 'parsed',
        parse: uuidParser,
        brief: 'The UUID of the corresponding data silo',
      },
      auth: createAuthParameter({
        scopes: [ScopeName.ManageAssignedDataInventory],
        requiresSiloScope: true,
      }),
      fileGlobs: {
        kind: 'parsed',
        parse: String,
        brief:
          'You can pass a glob syntax pattern(s) to specify additional file paths to scan. Comma-separated list of globs.',
        default: '',
      },
      ignoreDirs: {
        kind: 'parsed',
        parse: String,
        brief: 'Comma-separated list of directories to ignore.',
        default: '',
      },
      transcendUrl: createTranscendUrlParameter(),
    },
  },
  docs: {
    brief: 'Scan dependency management files to discover new data silos.',
    fullDescription: `We support scanning for new data silos in JavaScript, Python, Gradle, and CocoaPods projects.

To get started, add a data silo for the corresponding project type with the "silo discovery" plugin enabled. For example, if you want to scan a JavaScript project, add a package.json data silo. Then, specify the data silo ID in the "--dataSiloId" parameter.`,
  },
});
