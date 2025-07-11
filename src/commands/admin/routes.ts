import { buildRouteMap } from '@stricli/core';
import { generateApiKeysCommand } from './generate-api-keys/command';

export const adminRoutes = buildRouteMap({
  routes: {
    'generate-api-keys': generateApiKeysCommand,
  },
  docs: {
    brief: 'Admin commands',
  },
});
