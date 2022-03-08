#!/usr/bin/env node

import yargs from 'yargs-parser';
import { logger } from './logger';
import colors from 'colors';
import { pullTranscendConfiguration } from './pullTranscendConfiguration';
import { GraphQLClient } from 'graphql-request';
import { writeTranscendYaml } from './readTranscendYaml';
import { ADMIN_DASH } from './constants';

/**
 * Sync data silo configuration from Transcend down locally to disk
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-pull.ts --file=./examples/invalid.yml --auth=asd123
 *
 * Standard usage
 * yarn tr-push --file=./examples/invalid.yml --auth=asd123
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    file = './transcend.yml',
    transcendUrl = 'https://api.transcend.io',
    dataSiloIds = '',
    auth,
  } = yargs(process.argv.slice(2));

  // Ensure auth is passed
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

  // Sync to Disk
  try {
    const configuration = await pullTranscendConfiguration(
      client,
      (dataSiloIds as string).split(',').filter((x) => !!x),
    );
    writeTranscendYaml(file, configuration);
  } catch (err) {
    logger.error(
      colors.red(`An error occurred syncing the schema: ${err.message}`),
    );
    process.exit(1);
  }

  // Indicate success
  logger.info(
    colors.green(
      `Successfully synced yaml file to disk at ${file}! View at ${ADMIN_DASH}`,
    ),
  );
}

main();
