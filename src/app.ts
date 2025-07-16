import {
  buildInstallCommand,
  buildUninstallCommand,
} from '@stricli/auto-complete';
import { buildApplication, buildRouteMap } from '@stricli/core';
import { adminRoutes } from './commands/admin/routes';
import { consentRoutes } from './commands/consent/routes';
import { inventoryRoutes } from './commands/inventory/routes';
import { migrationRoutes } from './commands/migration/routes';
import { requestRoutes } from './commands/request/routes';
import { description, name, version } from './constants';

const routes = buildRouteMap({
  routes: {
    request: requestRoutes,
    consent: consentRoutes,
    inventory: inventoryRoutes,
    admin: adminRoutes,
    migration: migrationRoutes,
    install: buildInstallCommand('@transcend-io/transcend', {
      bash: '__@transcend-io/cli_bash_complete',
    }),
    uninstall: buildUninstallCommand('@transcend-io/transcend', { bash: true }),
  },
  docs: {
    brief: description,
    hideRoute: {
      install: true,
      uninstall: true,
    },
  },
});

export const app = buildApplication(routes, {
  name,
  versionInfo: {
    currentVersion: version,
  },
});
