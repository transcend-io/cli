import { buildRouteMap } from '@stricli/core';
import { generateApiKeysCommand } from './generate-api-keys/command';
import { chunkCsvCommand } from './chunk-csv/command';

export const adminRoutes = buildRouteMap({
  routes: {
    'generate-api-keys': generateApiKeysCommand,
    'chunk-csv': chunkCsvCommand,
  },
  docs: {
    brief: 'Admin commands',
  },
});
