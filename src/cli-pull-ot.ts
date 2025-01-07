#!/usr/bin/env node
import yargs from 'yargs-parser';
import { logger } from './logger';
import colors from 'colors';
import { getListOfAssessments } from './oneTrust';
import { OneTrustPullResource } from './enums';
import { createOneTrustGotInstance } from './oneTrust/createOneTrustGotInstance';
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
    // TODO: make this required!
    hostname = 'app-eu.onetrust.com',
    resource = OneTrustPullResource.Assessments,
    // pageSize = '',
    debug = '',
    // TODO: remove hardcode
    auth = 'ODgyOWYxZWYyYjExNDAwYjkyNDlkZWMzMzgzYTY5MTM6YnRIRkNHTUc4V0N3NEFvaGFEa3dHdGtUN0JLY2hHMkY=',
    /**
     * TODO: add
     * enrich
     * fileFormat
     */
  } = yargs(process.argv.slice(2));

  // Parse request actions
  if (!resource) {
    logger.error(
      colors.red(
        `Missing required parameter "resource". e.g. --resource=${OneTrustPullResource.Assessments}`,
      ),
    );
    process.exit(1);
  }

  if (!VALID_RESOURCES.includes(resource)) {
    logger.error(
      colors.red(
        `Received invalid resource value: "${resource}". Allowed: ${VALID_RESOURCES.join(
          ',',
        )}`,
      ),
    );
    process.exit(1);
  }

  // const pageSizeParsed = pageSize ? parseInt(pageSize, 10) : 50;
  const isDebug = debug === 'true';

  // Sync to Disk
  try {
    if (resource === OneTrustPullResource.Assessments) {
      const oneTrust = createOneTrustGotInstance({ hostname, auth });
      // const assessments =
      await getListOfAssessments({ oneTrust });
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
    }

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
