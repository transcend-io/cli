#!/usr/bin/env node

import yargs from 'yargs-parser';
import { logger } from './logger';
import colors from 'colors';
import {
  buildTranscendGraphQLClient,
  pullTranscendConfiguration,
  DEFAULT_TRANSCEND_PULL_RESOURCES,
  TranscendPullResource,
} from './graphql';
import { writeTranscendYaml } from './readTranscendYaml';
import { ADMIN_DASH_INTEGRATIONS } from './constants';

const VALID_RESOURCES = Object.values(TranscendPullResource);

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
    integrationNames = '',
    resources = DEFAULT_TRANSCEND_PULL_RESOURCES.join(','),
    pageSize = '',
    debug = '',
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
  const client = buildTranscendGraphQLClient(transcendUrl, auth);

  // Parse request actions
  let splitResources: TranscendPullResource[] = [];
  if (!resources) {
    logger.error(
      colors.red(
        `Missing required parameter "resources". e.g. --resources=${VALID_RESOURCES.join(
          ',',
        )}`,
      ),
    );
    process.exit(1);
  }
  splitResources = resources.split(',') as TranscendPullResource[];
  const invalidResources = splitResources.filter(
    (resource) => !VALID_RESOURCES.includes(resource),
  );
  if (invalidResources.length > 0) {
    logger.error(
      colors.red(
        `Received invalid resources values: "${invalidResources.join(
          ',',
        )}". Allowed: ${VALID_RESOURCES.join(',')}`,
      ),
    );
    process.exit(1);
  }

  // Sync to Disk
  try {
    const configuration = await pullTranscendConfiguration(client, {
      dataSiloIds: (dataSiloIds as string).split(',').filter((x) => !!x),
      integrationNames: (integrationNames as string)
        .split(',')
        .filter((x) => !!x),
      resources: splitResources,
      pageSize: pageSize ? parseInt(pageSize, 10) : 50,
      debug: debug === 'true',
    });

    logger.info(colors.magenta(`Writing configuration to file "${file}"...`));
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
      `Successfully synced yaml file to disk at ${file}! View at ${ADMIN_DASH_INTEGRATIONS}`,
    ),
  );
}

main();
