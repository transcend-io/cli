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
    skipDatapoints,
    skipSubDatapoints,
    includeGuessedCategories = 'false',
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
  const shouldSkipDataPoints = skipDatapoints;
  const shouldSkipSubDataPoints = skipSubDatapoints;

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
        skipDatapoints: shouldSkipDataPoints,
        skipSubDatapoints: shouldSkipSubDataPoints,
        includeGuessedCategories: includeGuessedCategories === 'true',
        trackerStatuses: parsedTrackerStatuses,
      });

      logger.info(colors.magenta(`Writing configuration to file "${file}"...`));
      writeTranscendYaml(file, configuration);
    } catch (err) {
      logger.error(
        colors.red(
          `An error occurred syncing the schema: ${
            debug ? err.stack : err.message
          }`,
        ),
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
          skipDatapoints: shouldSkipDataPoints,
          skipSubDatapoints: shouldSkipSubDataPoints,
          includeGuessedCategories: includeGuessedCategories === 'true',
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





#!/usr/bin/env node
import { logger } from './logger';
import colors from 'colors';
import {
  getListOfAssessments,
  getAssessment,
  writeOneTrustAssessment,
  parseCliPullOtArguments,
} from './oneTrust';
import { OneTrustPullResource } from './enums';
import { createOneTrustGotInstance } from './oneTrust/createOneTrustGotInstance';
import { mapSeries } from 'bluebird';

/**
 * Pull configuration from OneTrust down locally to disk
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-pull-ot.ts --hostname=customer.my.onetrust.com --auth=$ONE_TRUST_OAUTH_TOKEN --file=./oneTrustAssessment.json
 *
 * Standard usage
 * yarn cli-pull-ot --hostname=customer.my.onetrust.com --auth=$ONE_TRUST_OAUTH_TOKEN --file=./oneTrustAssessment.json
 */
async function main(): Promise<void> {
  const { file, fileFormat, hostname, auth, resource, debug } =
    parseCliPullOtArguments();

  try {
    if (resource === OneTrustPullResource.Assessments) {
      // use the hostname and auth token to instantiate a client to talk to OneTrust
      const oneTrust = createOneTrustGotInstance({ hostname, auth });

      // fetch the list of all assessments in the OneTrust organization
      const assessments = await getListOfAssessments({ oneTrust });

      // fetch details about one assessment at a time and sync to disk right away to avoid running out of memory
      await mapSeries(assessments, async (assessment, index) => {
        logger.info(
          `Fetching details about assessment ${index + 1} of ${
            assessments.length
          }...`,
        );
        const assessmentDetails = await getAssessment({
          oneTrust,
          assessmentId: assessment.assessmentId,
        });

        writeOneTrustAssessment({
          assessment,
          assessmentDetails,
          index,
          total: assessments.length,
          file,
          fileFormat,
        });
      });
    }
  } catch (err) {
    logger.error(
      colors.red(
        `An error occurred pulling the resource ${resource} from OneTrust: ${
          debug ? err.stack : err.message
        }`,
      ),
    );
    process.exit(1);
  }

  // Indicate success
  logger.info(
    colors.green(
      `Successfully synced OneTrust ${resource} to disk at "${file}"!`,
    ),
  );
}

main();
