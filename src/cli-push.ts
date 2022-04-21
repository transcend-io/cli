#!/usr/bin/env node

import yargs from 'yargs-parser';
import { logger } from './logger';
import { existsSync } from 'fs';
import { readTranscendYaml } from './readTranscendYaml';
import colors from 'colors';
import { TranscendInput } from './codecs';
import { syncConfigurationToTranscend } from './graphql';
import { GraphQLClient } from 'graphql-request';

import { ADMIN_DASH } from './constants';
import { ObjByString } from '@transcend-io/type-utils';
/**
 * Push the transcend.yml file remotely into a Transcend instance
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-push.ts --file=./examples/invalid.yml --auth=asd123 --variables=domain:acme.com,stage:staging
 *
 * Standard usage
 * yarn tr-push --file=./examples/invalid.yml --auth=asd123 --variables=domain:acme.com,stage:staging
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    file = './transcend.yml',
    transcendUrl = 'https://api.transcend.io',
    auth,
    variables = '',
  } = yargs(process.argv.slice(2)) as { [k in string]: string };

  // Ensure auth is passed
  if (!auth) {
    logger.error(
      colors.red(
        'A Transcend API key must be provided. You can specify using --auth=asd123',
      ),
    );
    process.exit(1);
  }

  // Ensure yaml file exists on disk
  if (!existsSync(file)) {
    logger.error(
      colors.red(
        `The file path does not exist on disk: ${file}. You can specify the filepath using --file=./examples/transcend.yml`,
      ),
    );
    process.exit(1);
  } else {
    logger.info(colors.magenta(`Reading file "${file}"...`));
  }

  let contents: TranscendInput;
  try {
    // Parse out the variables
    const splitVars = variables.split(',').filter((x) => !!x);
    const vars: ObjByString = {};
    splitVars.forEach((variable) => {
      const [k, v] = variable.split(':');
      vars[k] = v;
    });

    // Read in the yaml file and validate it's shape
    contents = readTranscendYaml(file, vars);
    logger.info(colors.green(`Successfully read in "${file}"`));
  } catch (err) {
    logger.error(
      colors.red(
        `The shape of your yaml file is invalid with the following errors: ${err.message}`,
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

  // Sync to Transcend
  try {
    const encounteredError = await syncConfigurationToTranscend(
      contents,
      client,
    );
    if (encounteredError) {
      logger.info(
        colors.red(
          `Sync encountered errors. View output above for more information, or check out ${ADMIN_DASH}`,
        ),
      );
      process.exit(1);
    }
  } catch (err) {
    logger.error(
      colors.red(`An error occurred syncing the schema: ${err.message}`),
    );
    process.exit(1);
  }

  // Indicate success
  logger.info(
    colors.green(
      `Successfully synced yaml file to Transcend! View at ${ADMIN_DASH}`,
    ),
  );
}

main();
