import { buildRouteMap } from '@stricli/core';
import { deriveDataSilosFromDataFlowsCrossInstanceCommand } from './derive-data-silos-from-data-flows-cross-instance/command';
import { deriveDataSilosFromDataFlowsCommand } from './derive-data-silos-from-data-flows/command';
import { discoverSilosCommand } from './discover-silos/command';
import { pullDatapointsCommand } from './pull-datapoints/command';
import { pullUnstructuredDiscoveryFilesCommand } from './pull-unstructured-discovery-files/command';
import { pullCommand } from './pull/command';
import { pushCommand } from './push/command';
import { scanPackagesCommand } from './scan-packages/command';

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
  },
  docs: {
    brief: 'Inventory commands',
  },
});
