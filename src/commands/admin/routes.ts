import { buildRouteMap } from '@stricli/core';
import { generateApiKeysCommand } from './generate-api-keys/command';
import { chunkCsvCommand } from './chunk-csv/command';
import { parquetToCsvCommand } from './parquet-to-csv/command';

export const adminRoutes = buildRouteMap({
  routes: {
    'generate-api-keys': generateApiKeysCommand,
    'chunk-csv': chunkCsvCommand,
    'parquet-to-csv': parquetToCsvCommand,
  },
  docs: {
    brief: 'Admin commands',
  },
});
