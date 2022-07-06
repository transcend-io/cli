#!/usr/bin/env node

import yargs from 'yargs-parser';
import { logger } from './logger';
import colors from 'colors';
import { ADMIN_DASH } from './constants';
import { GraphQLClient } from 'graphql-request';
import { SILO_DISCOVERY_FUNCTIONS } from './plugins';
import {
  fetchActiveSiloDiscoPlugin,
  uploadSiloDiscoveryResults,
} from './graphql';
import { findFilesToScan } from './plugins/findFilesToScan';

/**
 * Scan dependency files for new data silos.
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-discover-silos.ts --scanPath=./myJavascriptProject \
 *   --auth=asd123 \
 *   --ignoreDirs=build_directories_to_ignore \
 *   --dataSiloId=abcdefgh
 *
 * Note: the data silo ID has to belong to a data silo that has an active plugin of type SILO_DISCOVERY
 *
 * Standard usage
 * yarn tr-scan  --scanPath=./myJavascriptProject --auth=asd123
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    scanPath = '.',
    transcendUrl = 'https://api.transcend.io',
    dataSiloId = '',
    auth,
  } = yargs(process.argv.slice(2));

  // // Ensure auth is passed
  if (!auth) {
    logger.error(
      colors.red(
        'A Transcend API key must be provided. You can specify using --auth=asd123',
      ),
    );
    process.exit(1);
  }

  // Create a GraphQL client
  // eslint-disable-next-line global-require
  const { version } = require('../package.json');
  const client = new GraphQLClient(`${transcendUrl}/graphql`, {
    headers: {
      Authorization: `Bearer ${auth}`,
      version,
    },
  });

  const plugin = await fetchActiveSiloDiscoPlugin(client, dataSiloId);
  const config = SILO_DISCOVERY_FUNCTIONS[plugin.dataSilo.type];
  const results = await findFilesToScan(scanPath, config);

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
