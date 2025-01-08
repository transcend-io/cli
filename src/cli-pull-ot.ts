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
 * TODO: update this comment
 * Dev Usage:
 * yarn ts-node ./src/cli-pull.ts --file=./examples/invalid.yml --auth=$ONE_TRUST_OAUTH_TOKEN
 *
 * Standard usage
 * yarn tr-push --file=./examples/invalid.yml --auth=$ONE_TRUST_OAUTH_TOKEN
 */
async function main(): Promise<void> {
  const { file, fileFormat, hostname, auth, resource, debug } =
    parseCliPullOtArguments();

  // Sync to Disk
  try {
    if (resource === OneTrustPullResource.Assessments) {
      const oneTrust = createOneTrustGotInstance({ hostname, auth });
      const assessments = await getListOfAssessments({ oneTrust });

      logger.info('Retrieving details about the fetched assessments...');

      await mapSeries(assessments, async (assessment, index) => {
        logger.info(
          `Enriching assessment ${index + 1} of ${assessments.length}`,
        );

        // fetch details about the assessment
        const assessmentDetails = await getAssessment({
          oneTrust,
          assessmentId: assessment.assessmentId,
        });

        // write to disk
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
