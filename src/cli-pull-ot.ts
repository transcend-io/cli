#!/usr/bin/env node
import { logger } from './logger';
import colors from 'colors';
import {
  getListOfAssessments,
  getAssessment,
  writeOneTrustAssessment,
  parseCliPullOtArguments,
  createOneTrustGotInstance,
} from './oneTrust';
import { OneTrustPullResource } from './enums';
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
