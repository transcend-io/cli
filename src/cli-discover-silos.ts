#!/usr/bin/env node

import { mapSeries } from 'bluebird';
import yargs from 'yargs-parser';
import { logger } from './logger';
import colors from 'colors';
import { ADMIN_DASH } from './constants';
import { GraphQLClient } from 'graphql-request';
import { ADD_SILO_DISCOVERY_RESULTS } from './gqls';
import { SILO_DISCOVERY_FUNCTIONS, SupportedPlugin } from './plugins';
import { isSupportedPlugin } from './plugins/typeguards';

const CHUNK_SIZE = 1000;

/**
 * Sync data silo configuration from Transcend down locally to disk
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-discover-silos.ts --scanPath=./myJavascriptProject \
 *   --auth=asd123 \
 *   --ignoreDirs=node_modules,serverless-build \
 *   --pluginType="javascriptPackageJson"
 *   --pluginId=abcdefgh
 *
 * Standard usage
 * yarn tr-scan  --scanPath=./myJavascriptProject --auth=asd123
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    scanPath = '.',
    ignoreDirs = '',
    transcendUrl = 'https://api.transcend.io',
    pluginType = '',
    pluginId = '',
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
  const resolvedPlugin = isSupportedPlugin(pluginType);
  if (!resolvedPlugin) {
    logger.error('Unsupported plugin type');
    process.exit(1);
  }
  const scanFunction = SILO_DISCOVERY_FUNCTIONS[pluginType as SupportedPlugin]; // safe to cast now
  const rawResults = await scanFunction(scanPath, ignoreDirs);

  const chunks = [];
  for (let i = 0; i < rawResults.length; i += CHUNK_SIZE) {
    chunks.push(rawResults.slice(i, i + CHUNK_SIZE));
    // do whatever
  }

  mapSeries(
    chunks,
    await client.request<{
      /** Whether we successfully uploaded the results */
      success: boolean;
    }>(ADD_SILO_DISCOVERY_RESULTS, {
      pluginId,
      rawResults,
    }),
  );

  // Indicate success
  logger.info(
    colors.green(
      `Scan found ${rawResults.length} potential data silos at ${scanPath}! View at ${ADMIN_DASH}`,
    ),
  );
}

main();
