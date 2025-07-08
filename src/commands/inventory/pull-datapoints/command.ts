import { buildCommand } from '@stricli/core';
import { ScopeName } from '@transcend-io/privacy-types';
import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '@/cli/common-parameters';

export const pullDatapointsCommand = buildCommand({
  loader: async () => {
    const { pullDatapoints } = await import('./impl');
    return pullDatapoints;
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
        default: './datapoints.csv',
      },
      transcendUrl: createTranscendUrlParameter(),
      dataSiloIds: {
        kind: 'parsed',
        parse: String,
        brief: 'Comma-separated list of data silo IDs to filter by',
        optional: true,
      },
      includeAttributes: {
        kind: 'boolean',
        brief: 'Whether to include attributes in the output',
        default: false,
      },
      includeGuessedCategories: {
        kind: 'boolean',
        brief: 'Whether to include guessed categories in the output',
        default: false,
      },
      parentCategories: {
        kind: 'parsed',
        parse: String,
        brief: 'Comma-separated list of parent categories to filter by',
        optional: true,
      },
      subCategories: {
        kind: 'parsed',
        parse: String,
        brief: 'Comma-separated list of subcategories to filter by',
        optional: true,
      },
    },
  },
  docs: {
    brief: 'Pull datapoints',
    fullDescription:
      'This command allows for pulling your Data Inventory -> Datapoints into a CSV.',
  },
});
