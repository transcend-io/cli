#!/usr/bin/env node
import got from 'got';

import yargs from 'yargs-parser';
import { logger } from './logger';
import colors from 'colors';
import { DEFAULT_ONE_TRUST_PULL_RESOURCES } from './oneTrust';
import { OneTrustPullResource } from './enums';
// import { mapSeries } from 'bluebird';

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
    hostname = 'app-eu.onetrust.com',
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
          'Bearer ODgyOWYxZWYyYjExNDAwYjkyNDlkZWMzMzgzYTY5MTM6YnRIRkNHTUc4V0N3NEFvaGFEa3dHdGtUN0JLY2hHMkY=',
      },
    });

    // TODO: get based on the resources
    // TODO: export into its own function
    let currentPage = 0;
    let totalPages = 1;
    let totalElements = 0;

    const allAssessments = [];

    logger.info('Getting list of OneTrust assessments...');
    while (currentPage < totalPages) {
      // eslint-disable-next-line no-await-in-loop
      const { body } = await oneTrust.get(
        `api/assessment/v2/assessments?page=${currentPage}&size=2000`,
      );
      const parsedBody = JSON.parse(body);
      const assessments = parsedBody.content ?? [];
      console.log({ assessments });
      allAssessments.push(...assessments);
      const page = parsedBody.page ?? { totalPages: 0, totalElements: 0 };
      if (currentPage === 0) {
        totalPages = page.totalPages;
        totalElements = page.totalElements;
      }
      currentPage += 1;

      // log progress
      logger.info(
        `Fetched ${allAssessments.length} of ${totalElements} assessments.`,
      );
    }

    // logger.info('Enriching the fetched OneTrust assessments with details');
    // await mapSeries(allAssessments, async (assessment, index) => {
    //   logger.info(
    //     `Enriching assessment ${index + 1} of ${allAssessments.length}`,
    //   );

    //   const { body } = await oneTrust.get(
    //     `api/assessment/v2/assessments/${assessment.assessmentId}/export?ExcludeSkippedQuestions=false`,
    //   );
    //   const parsedBody = JSON.parse(body);

    //   console.log({ parsedBody });
    // });

    // const detailsBody = JSON.parse(details.body);

    // logger.info(colors.magenta('Writing configuration to file "file"...'));
    // writeTranscendYaml(file, configuration);
  } catch (err) {
    logger.error(
      colors.red(
        `An error occurred pulling the resource: ${
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
