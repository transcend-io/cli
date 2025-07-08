import { buildCommand } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';
import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '@/cli/common-parameters';

export const pullUnstructuredDiscoveryFilesCommand = buildCommand({
  loader: async () => {
    const { pullUnstructuredDiscoveryFiles } = await import('./impl');
    return pullUnstructuredDiscoveryFiles;
  },
  parameters: {
    flags: {
      auth: createAuthParameter({
        scopes: [ScopeName.ViewDataInventory],
      }),
      file: {
        kind: 'parsed',
        parse: String,
        brief: 'The file to save datapoints to',
        default: './unstructured-discovery-files.csv',
      },
      transcendUrl: createTranscendUrlParameter(),
      dataSiloIds: {
        kind: 'parsed',
        parse: String,
        brief: 'Comma-separated list of data silo IDs to filter by',
        optional: true,
      },
      subCategories: {
        kind: 'parsed',
        parse: String,
        brief: 'Comma-separated list of data categories to filter by',
        optional: true,
      },
      status: {
        kind: 'parsed',
        parse: String,
        brief: 'Comma-separated list of classification statuses to filter by',
        optional: true,
      },
      includeEncryptedSnippets: {
        kind: 'boolean',
        brief:
          'Whether to include encrypted snippets of the entries classified',
        default: false,
      },
    },
  },
  docs: {
    brief: 'Pull unstructured discovery files',
    fullDescription:
      'This command allows for pulling Unstructured Discovery into a CSV.',
  },
});
