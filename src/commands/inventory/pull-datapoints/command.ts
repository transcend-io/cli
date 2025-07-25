import { buildCommand } from '@stricli/core';
import { DataCategoryType, ScopeName } from '@transcend-io/privacy-types';
import {
  createAuthParameter,
  createTranscendUrlParameter,
} from '../../../lib/cli/common-parameters';

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
        variadic: ',',
        brief: 'List of data silo IDs to filter by',
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
        kind: 'enum',
        values: Object.values(DataCategoryType),
        brief: 'List of parent categories to filter by',
        variadic: ',',
        optional: true,
      },
      subCategories: {
        kind: 'parsed',
        parse: String,
        brief: 'List of subcategories to filter by',
        variadic: ',',
        optional: true,
      },
    },
  },
  docs: {
    brief: 'Export the datapoints from your Data Inventory into a CSV.',
  },
});
