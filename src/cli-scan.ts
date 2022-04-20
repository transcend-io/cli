#!/usr/bin/env node

import fastGlob from 'fast-glob';
import yargs from 'yargs-parser';
import { logger } from './logger';
import colors from 'colors';
import { ADMIN_DASH } from './constants';
import { scanPackageJson } from './plugins/scanPackageJson';
import { GraphQLClient } from 'graphql-request';
import { ADD_SILO_DISCOVERY_RESULTS } from './gqls';

const SUPPORTED_FILE_SCANS = ['package.json'];
const IGNORE_DIRS = ['node_modules', 'serverless-build'];

/**
 * Sync data silo configuration from Transcend down locally to disk
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-scan.ts --scanPath=./myJavascriptProject --auth=asd123 --ignoreDirs=node_modules,serverless-build
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
  const dirsToIgnore = [...IGNORE_DIRS, ...ignoreDirs.split(',')];
  const filesToScan = await fastGlob(
    `${scanPath}/**/${SUPPORTED_FILE_SCANS.join('|')}`,
    {
      ignore: dirsToIgnore.map((dir: string) => `${scanPath}/**/${dir}`),
      unique: true,
      onlyFiles: true,
    },
  );
  const allDeps = filesToScan
    .map((filePath) => scanPackageJson(filePath))
    .flat();
  const uniqueDeps = new Set(allDeps);

  // TODO: Chunk up the results by 1000 each
  client.request<{
    /** Whether we successfully uploaded the results */
    success: boolean;
  }>(ADD_SILO_DISCOVERY_RESULTS, {
    pluginId,
    rawResults: [...uniqueDeps].map((dep) => ({
      name: dep,
      resourceId: `${scanPath}/**/${dep}`,
    })),
  });

  // Indicate success
  logger.info(
    colors.green(
      `Successfully scanned ${filesToScan.length} files at ${scanPath}! View at ${ADMIN_DASH}`,
    ),
  );
}

main();
