#!/usr/bin/env node

import yargs from 'yargs-parser';
import { logger } from './logger';
import colors from 'colors';
import { mapSeries } from 'bluebird';
import { join } from 'path';
import fs from 'fs';
import {
  buildTranscendGraphQLClient,
  pullTranscendConfiguration,
  DEFAULT_TRANSCEND_PULL_RESOURCES,
} from './graphql';
import { ConsentTrackerStatus } from '@transcend-io/privacy-types';
import { validateTranscendAuth } from './api-keys';
import { writeTranscendYaml } from './readTranscendYaml';
import { ADMIN_DASH_INTEGRATIONS, DEFAULT_TRANSCEND_API } from './constants';
import { splitCsvToList } from './requests';
import { TranscendPullResource } from './enums';

const VALID_RESOURCES = Object.values(TranscendPullResource);

/**
 * Sync data silo configuration from Transcend down locally to disk
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-pull.ts --file=./examples/invalid.yml --auth=$TRANSCEND_API_KEY
 *
 * Standard usage
 * yarn tr-push --file=./examples/invalid.yml --auth=$TRANSCEND_API_KEY
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const {
    file = './transcend.yml',
    transcendUrl = DEFAULT_TRANSCEND_API,
    dataSiloIds = '',
    integrationNames = '',
    resources = DEFAULT_TRANSCEND_PULL_RESOURCES.join(','),
    pageSize = '',
    debug = '',
    auth,
    trackerStatuses = Object.values(ConsentTrackerStatus).join(','),
  } = yargs(process.argv.slice(2));

  // Parse authentication as API key or path to list of API keys
  const apiKeyOrList = await validateTranscendAuth(auth);

  // Validate trackerStatuses
  const parsedTrackerStatuses = splitCsvToList(
    trackerStatuses,
  ) as ConsentTrackerStatus[];
  const invalidTrackerStatuses = parsedTrackerStatuses.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (type) => !Object.values(ConsentTrackerStatus).includes(type as any),
  );
  if (invalidTrackerStatuses.length > 0) {
    logger.error(
      colors.red(
        `Failed to parse trackerStatuses:"${invalidTrackerStatuses.join(
          ',',
        )}".\n` +
          `Expected one of: \n${Object.values(ConsentTrackerStatus).join(
            '\n',
          )}`,
      ),
    );
    process.exit(1);
  }

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
  splitResources =
    resources === 'all'
      ? VALID_RESOURCES
      : (resources.split(',') as TranscendPullResource[]);
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

  const dataSiloIdsParsed = (dataSiloIds as string)
    .split(',')
    .filter((x) => !!x);
  const integrationNamesParsed = (integrationNames as string)
    .split(',')
    .filter((x) => !!x);
  const pageSizeParsed = pageSize ? parseInt(pageSize, 10) : 50;
  const isDebug = debug === 'true';

  // Sync to Disk
  if (typeof apiKeyOrList === 'string') {
    try {
      // Create a GraphQL client
      const client = buildTranscendGraphQLClient(transcendUrl, apiKeyOrList);

      const configuration = await pullTranscendConfiguration(client, {
        dataSiloIds: dataSiloIdsParsed,
        integrationNames: integrationNamesParsed,
        resources: splitResources,
        pageSize: pageSizeParsed,
        debug: isDebug,
        trackerStatuses: parsedTrackerStatuses,
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
  } else {
    if (!fs.lstatSync(file).isDirectory()) {
      throw new Error(
        'File is expected to be a folder when passing in a list of API keys to pull from. e.g. --file=./working/',
      );
    }

    const encounteredErrors: string[] = [];
    await mapSeries(apiKeyOrList, async (apiKey, ind) => {
      const prefix = `[${ind + 1}/${apiKeyOrList.length}][${
        apiKey.organizationName
      }] `;
      logger.info(
        colors.magenta(
          `~~~\n\n${prefix}Attempting to pull configuration...\n\n~~~`,
        ),
      );

      // Create a GraphQL client
      const client = buildTranscendGraphQLClient(transcendUrl, apiKey.apiKey);

      try {
        const configuration = await pullTranscendConfiguration(client, {
          dataSiloIds: dataSiloIdsParsed,
          integrationNames: integrationNamesParsed,
          resources: splitResources,
          pageSize: pageSizeParsed,
          debug: isDebug,
          trackerStatuses: parsedTrackerStatuses,
        });

        const filePath = join(file, `${apiKey.organizationName}.yml`);
        logger.info(
          colors.magenta(`Writing configuration to file "${filePath}"...`),
        );
        writeTranscendYaml(filePath, configuration);

        logger.info(
          colors.green(`${prefix}Successfully pulled configuration!`),
        );
      } catch (err) {
        logger.error(
          colors.red(`${prefix}Failed to sync configuration. - ${err.message}`),
        );
        encounteredErrors.push(apiKey.organizationName);
      }
    });

    if (encounteredErrors.length > 0) {
      logger.info(
        colors.red(
          `Sync encountered errors for "${encounteredErrors.join(
            ',',
          )}". View output above for more information, or check out ${ADMIN_DASH_INTEGRATIONS}`,
        ),
      );

      process.exit(1);
    }
  }
}

main();
