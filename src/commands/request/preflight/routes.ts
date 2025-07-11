import { buildRouteMap } from '@stricli/core';
import { pullIdentifiersCommand } from './pull-identifiers/command';
import { pushIdentifiersCommand } from './push-identifiers/command';

export const preflightRoutes = buildRouteMap({
  routes: {
    'pull-identifiers': pullIdentifiersCommand,
    'push-identifiers': pushIdentifiersCommand,
  },
  docs: {
    brief: 'Preflight commands',
  },
});
