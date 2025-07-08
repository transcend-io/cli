import { buildCommand } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';
import { createAuthParameter } from '../../../cli/common-parameters';
import { uuidParser } from '../../../cli/parsers';

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
          'You can pass a glob syntax pattern(s) to specify additional file paths to scan',
        optional: true,
      },
    },
  },
  docs: {
    brief: 'Discover silos',
    fullDescription:
      'Transcend can help scan dependency management files to help detect new data silos where you may be storing user personal data.',
  },
});
