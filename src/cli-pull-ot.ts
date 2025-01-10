#!/usr/bin/env node
import { logger } from './logger';
import colors from 'colors';
import {
  getListOfOneTrustAssessments,
  getOneTrustAssessment,
  writeOneTrustAssessment,
  parseCliPullOtArguments,
  createOneTrustGotInstance,
  getOneTrustRisk,
} from './oneTrust';
import { OneTrustPullResource } from './enums';
import { mapSeries, map } from 'bluebird';
import uniq from 'lodash/uniq';
import { OneTrustGetRiskResponseCodec } from './oneTrust/codecs';

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
      const assessments = await getListOfOneTrustAssessments({ oneTrust });

      // fetch details about one assessment at a time and sync to disk right away to avoid running out of memory
      await mapSeries(assessments, async (assessment, index) => {
        logger.info(
          `Fetching details about assessment ${index + 1} of ${
            assessments.length
          }...`,
        );
        const assessmentDetails = await getOneTrustAssessment({
          oneTrust,
          assessmentId: assessment.assessmentId,
        });

        // enrich assessments with risk information
        let riskDetails: OneTrustGetRiskResponseCodec[] = [];
        const riskIds = uniq(
          assessmentDetails.sections.flatMap((s) =>
            s.questions.flatMap((q) =>
              (q.risks ?? []).flatMap((r) => r.riskId),
            ),
          ),
        );
        if (riskIds.length > 0) {
          logger.info(
            `Fetching details about ${riskIds.length} risks for assessment ${
              index + 1
            } of ${assessments.length}...`,
          );
          riskDetails = await map(
            riskIds,
            (riskId) => getOneTrustRisk({ oneTrust, riskId }),
            {
              concurrency: 5,
            },
          );
        }

        writeOneTrustAssessment({
          assessment,
          assessmentDetails,
          riskDetails,
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
