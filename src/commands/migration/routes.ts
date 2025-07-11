import { buildRouteMap } from '@stricli/core';
import { syncOtCommand } from './sync-ot/command';

export const migrationRoutes = buildRouteMap({
  routes: {
    'sync-ot': syncOtCommand,
  },
  docs: {
    brief: 'Migration commands',
  },
});
