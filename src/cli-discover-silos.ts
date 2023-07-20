#!/usr/bin/env node

import yargs from 'yargs-parser';
import { logger } from './logger';
import colors from 'colors';
import { ADMIN_DASH, DEFAULT_TRANSCEND_API } from './constants';
import { SILO_DISCOVERY_FUNCTIONS } from './plugins';
import {
  fetchActiveSiloDiscoPlugin,
  buildTranscendGraphQLClient,
  uploadSiloDiscoveryResults,
} from './graphql';
import { findFilesToScan } from './plugins/findFilesToScan';

/**
 * Scan dependency files for new data silos.
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-discover-silos.ts --scanPath=./myJavascriptProject \
 *   --auth=$TRANSCEND_API_KEY \
 *   --ignoreDirs=build_directories_to_ignore \
 *   --dataSiloId=abcdefgh
 *
 * Note: the data silo ID has to belong to a data silo that has an active plugin of type SILO_DISCOVERY
 *
 * Standard usage
 * yarn tr-scan  --scanPath=./myJavascriptProject --auth=$TRANSCEND_API_KEY
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    scanPath = '.',
    ignoreDirs = '',
    transcendUrl = DEFAULT_TRANSCEND_API,
    dataSiloId = '',
    fileGlobs = '',
    auth,
  } = yargs(process.argv.slice(2));

  // // Ensure auth is passed
  if (!auth) {
    logger.error(
      colors.red(
        'A Transcend API key must be provided. You can specify using --auth=$TRANSCEND_API_KEY',
      ),
    );
    process.exit(1);
  }
  // Create a GraphQL client
  const client = buildTranscendGraphQLClient(transcendUrl, auth);

  const plugin = await fetchActiveSiloDiscoPlugin(client, dataSiloId);
  const config = SILO_DISCOVERY_FUNCTIONS[plugin.dataSilo.type];
  const results = await findFilesToScan(
    scanPath,
    fileGlobs,
    ignoreDirs,
    config,
  );

  await uploadSiloDiscoveryResults(client, plugin.id, results);

  // Indicate success
  logger.info(
    colors.green(
      `Scan found ${results.length} potential data silos at ${scanPath}! ` +
        `View at ${ADMIN_DASH}/data-map/data-inventory/silo-discovery/triage`,
    ),
  );
}

main();
