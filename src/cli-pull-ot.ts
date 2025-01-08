#!/usr/bin/env node
import yargs from 'yargs-parser';
import { logger } from './logger';
import colors from 'colors';
import { getListOfAssessments } from './oneTrust';
import { OneTrustFileFormat, OneTrustPullResource } from './enums';
import { createOneTrustGotInstance } from './oneTrust/createOneTrustGotInstance';
// import { mapSeries } from 'bluebird';

const VALID_RESOURCES = Object.values(OneTrustPullResource);
const VALID_FILE_FORMATS = Object.values(OneTrustFileFormat);

interface OneTrustCliArguments {
  /** The OneTrust hostname to send the requests to */
  hostname: string;
  /** The OAuth Bearer token used to authenticate the requests */
  auth: string;
  /** The resource to pull from OneTrust */
  resource: OneTrustPullResource;
  /** Whether to enable debugging while reporting errors */
  debug: boolean;
  /** The export format of the file where to save the resources */
  fileFormat: OneTrustFileFormat;
}

/**
 * Parse the command line arguments
 *
 * @returns the parsed arguments
 */
const parseCliArguments = (): OneTrustCliArguments => {
  const {
    // file = './transcend.yml',
    hostname,
    auth,
    resource,
    debug,
    fileFormat,
  } = yargs(process.argv.slice(2), {
    string: ['hostname', 'auth', 'resource', 'fileFormat'],
    boolean: ['debug'],
    default: {
      resource: OneTrustPullResource.Assessments,
      fileFormat: OneTrustFileFormat.Json,
    },
  });

  if (!hostname) {
    logger.error(
      colors.red(
        'Missing required parameter "hostname". e.g. --hostname=customer.my.onetrust.com',
      ),
    );
    return process.exit(1);
  }
  if (!auth) {
    logger.error(
      colors.red(
        'Missing required parameter "auth". e.g. --auth=$ONE_TRUST_AUTH_TOKEN',
      ),
    );
    return process.exit(1);
  }
  if (!VALID_RESOURCES.includes(resource)) {
    logger.error(
      colors.red(
        `Received invalid resource value: "${resource}". Allowed: ${VALID_RESOURCES.join(
          ',',
        )}`,
      ),
    );
    return process.exit(1);
  }
  if (!VALID_FILE_FORMATS.includes(fileFormat)) {
    logger.error(
      colors.red(
        `Received invalid fileFormat value: "${fileFormat}". Allowed: ${VALID_FILE_FORMATS.join(
          ',',
        )}`,
      ),
    );
    return process.exit(1);
  }

  return {
    hostname,
    auth,
    resource,
    debug: debug === undefined ? false : debug,
    fileFormat,
  };
};

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
  const { hostname, auth, resource, debug } = parseCliArguments();

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
          debug ? err.stack : err.message
        }`,
      ),
    );
    process.exit(1);
  }

  // Indicate success
  logger.info(colors.green('Successfully synced yaml file to disk at "file"!'));
}

main();
