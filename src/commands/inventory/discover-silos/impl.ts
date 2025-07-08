import type { LocalContext } from '@/context';
import { stringify } from 'query-string';
import { logger } from '@/logger';
import colors from 'colors';
import { ADMIN_DASH } from '@/constants';
import {
  fetchActiveSiloDiscoPlugin,
  buildTranscendGraphQLClient,
  uploadSiloDiscoveryResults,
} from '@/lib/graphql';
import { findFilesToScan } from '@/lib/code-scanning/findFilesToScan';
import { SILO_DISCOVERY_CONFIGS } from '@/lib/code-scanning';

interface DiscoverSilosCommandFlags {
  scanPath: string;
  dataSiloId: string;
  auth: string;
  fileGlobs: string;
  ignoreDirs: string;
  transcendUrl: string;
}

export async function discoverSilos(
  this: LocalContext,
  {
    scanPath,
    dataSiloId,
    auth,
    fileGlobs,
    ignoreDirs,
    transcendUrl,
  }: DiscoverSilosCommandFlags,
): Promise<void> {
  // Create a GraphQL client
  const client = buildTranscendGraphQLClient(transcendUrl, auth);

  const plugin = await fetchActiveSiloDiscoPlugin(client, dataSiloId);

  const config = SILO_DISCOVERY_CONFIGS[plugin.dataSilo.type];
  if (!config) {
    logger.error(
      colors.red(
        `This plugin "${plugin.dataSilo.type}" is not supported for offline silo discovery.`,
      ),
    );
    process.exit(1);
  }

  const results = await findFilesToScan({
    scanPath,
    fileGlobs,
    ignoreDirs,
    config,
  });

  await uploadSiloDiscoveryResults(client, plugin.id, results);

  const newUrl = new URL(ADMIN_DASH);
  newUrl.pathname = '/data-map/data-inventory/silo-discovery/triage';
  newUrl.search = stringify({
    filters: JSON.stringify({ pluginIds: [plugin.id] }),
  });

  // Indicate success
  logger.info(
    colors.green(
      `Scan found ${results.length} potential data silos at ${scanPath}! ` +
        `View at '${newUrl.href}' ` +
        '\n\n NOTE: it may take 2-3 minutes for scan results to appear in the UI.',
    ),
  );
}
