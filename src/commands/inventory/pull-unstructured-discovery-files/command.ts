import { buildCommand } from '@stricli/core';
import {
  ScopeName,
  UnstructuredSubDataPointRecommendationStatus,
} from '@transcend-io/privacy-types';
import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '../../../lib/cli/common-parameters';

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
        brief: 'List of data silo IDs to filter by',
        variadic: ',',
        optional: true,
      },
      subCategories: {
        kind: 'parsed',
        parse: String,
        brief: 'List of data categories to filter by',
        variadic: ',',
        optional: true,
      },
      status: {
        kind: 'enum',
        values: Object.values(UnstructuredSubDataPointRecommendationStatus),
        brief: 'List of classification statuses to filter by',
        variadic: ',',
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
