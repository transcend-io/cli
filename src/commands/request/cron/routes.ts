import { buildRouteMap } from '@stricli/core';
import { markIdentifiersCompletedCommand } from './mark-identifiers-completed/command';
import { pullIdentifiersCommand } from './pull-identifiers/command';
import { pullProfilesCommand } from './pull-profiles/command';

export const cronRoutes = buildRouteMap({
  routes: {
    'pull-identifiers': pullIdentifiersCommand,
    'pull-profiles': pullProfilesCommand,
    'mark-identifiers-completed': markIdentifiersCompletedCommand,
  },
  docs: {
    brief: 'Cron commands',
  },
});
