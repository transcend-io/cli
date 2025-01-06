#!/usr/bin/env node
import got from 'got';

import yargs from 'yargs-parser';
import { logger } from './logger';
import colors from 'colors';
import { DEFAULT_ONE_TRUST_PULL_RESOURCES } from './oneTrust';
import { OneTrustPullResource } from './enums';

const VALID_RESOURCES = Object.values(OneTrustPullResource);

/**
 * Pull configuration from OneTrust down locally to disk
 *
 * TODO: update this comment
 * Dev Usage:
 * yarn ts-node ./src/cli-pull.ts --file=./examples/invalid.yml --auth=$ONE_TRUST_OAUTH_TOKEN
 *
 * Standard usage
 * yarn tr-push --file=./examples/invalid.yml --auth=$ONE_TRUST_OAUTH_TOKEN
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    // file = './transcend.yml',
    // dataSiloIds = '',
    // integrationNames = '',
    // skipDatapoints,
    // skipSubDatapoints,
    // includeGuessedCategories = 'false',
    // TODO: make this required!
    hostname = 'informa.onetrust.com',
    resources = DEFAULT_ONE_TRUST_PULL_RESOURCES.join(','),
    // pageSize = '',
    debug = '',
    // auth,
    // trackerStatuses = Object.values(ConsentTrackerStatus).join(','),
  } = yargs(process.argv.slice(2));

  // Parse request actions
  let splitResources: OneTrustPullResource[] = [];
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
  splitResources =
    resources === 'all'
      ? VALID_RESOURCES
      : (resources.split(',') as OneTrustPullResource[]);
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

  // const pageSizeParsed = pageSize ? parseInt(pageSize, 10) : 50;
  const isDebug = debug === 'true';

  // Sync to Disk
  try {
    // TODO invoke a createOneTrustGotInstance helper inspired by createSombraGotInstance
    const oneTrust = got.extend({
      // TODO: create constant or env var
      prefixUrl: `https://${hostname}`,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        // TODO: fetch from environment
        authorization:
          'Bearer 9406677f66c38aa60c17ec4937630ce1bb0060fc4f9322224250f0de2cfa0772',
      },
    });

    // TODO: get based on the resources
    await oneTrust.get('api/assessment/v2/assessments');
    // console.log({ result });

    // logger.info(colors.magenta('Writing configuration to file "file"...'));
    // writeTranscendYaml(file, configuration);
  } catch (err) {
    logger.error(
      colors.red(
        `An error occurred syncing the schema: ${
          isDebug ? err.stack : err.message
        }`,
      ),
    );
    process.exit(1);
  }

  // Indicate success
  logger.info(colors.green('Successfully synced yaml file to disk at "file"!'));
}

main();
