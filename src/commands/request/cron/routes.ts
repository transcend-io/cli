import { buildRouteMap } from '@stricli/core';
import { markIdentifiersCompletedCommand } from './mark-identifiers-completed/command';
import { pullIdentifiersCommand } from './pull-identifiers/command';

export const cronRoutes = buildRouteMap({
  routes: {
    'pull-identifiers': pullIdentifiersCommand,
    'mark-identifiers-completed': markIdentifiersCompletedCommand,
  },
  docs: {
    brief: 'Cron commands',
  },
});
