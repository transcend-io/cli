import { buildRouteMap } from '@stricli/core';
import { deriveDataSilosFromDataFlowsCrossInstanceCommand } from './derive-data-silos-from-data-flows-cross-instance/command';
import { deriveDataSilosFromDataFlowsCommand } from './derive-data-silos-from-data-flows/command';
import { discoverSilosCommand } from './discover-silos/command';
import { pullDatapointsCommand } from './pull-datapoints/command';
import { pullUnstructuredDiscoveryFilesCommand } from './pull-unstructured-discovery-files/command';
import { pullCommand } from './pull/command';
import { pushCommand } from './push/command';
import { scanPackagesCommand } from './scan-packages/command';
import { redactUnstructuredDataCommand } from './redact-unstructured-data/command';
import { consentManagerServiceJsonToYmlCommand } from './consent-manager-service-json-to-yml/command';
import { consentManagersToBusinessEntitiesCommand } from './consent-managers-to-business-entities/command';

export const inventoryRoutes = buildRouteMap({
  routes: {
    pull: pullCommand,
    push: pushCommand,
    'scan-packages': scanPackagesCommand,
    'discover-silos': discoverSilosCommand,
    'pull-datapoints': pullDatapointsCommand,
    'pull-unstructured-discovery-files': pullUnstructuredDiscoveryFilesCommand,
    'derive-data-silos-from-data-flows': deriveDataSilosFromDataFlowsCommand,
    'derive-data-silos-from-data-flows-cross-instance':
      deriveDataSilosFromDataFlowsCrossInstanceCommand,
    'consent-manager-service-json-to-yml':
      consentManagerServiceJsonToYmlCommand,
    'consent-managers-to-business-entities':
      consentManagersToBusinessEntitiesCommand,
    'redact-unstructured-data': redactUnstructuredDataCommand,
  },
  docs: {
    brief: 'Inventory commands',
  },
});
