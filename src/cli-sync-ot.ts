#!/usr/bin/env node
import { logger } from './logger';
import keyBy from 'lodash/keyBy';

import colors from 'colors';
import {
  getListOfOneTrustAssessments,
  getOneTrustAssessment,
  writeOneTrustAssessment,
  parseCliSyncOtArguments,
  createOneTrustGotInstance,
  getOneTrustRisk,
} from './oneTrust';
import { OneTrustPullResource } from './enums';
import { mapSeries, map } from 'bluebird';
import uniq from 'lodash/uniq';
import {
  OneTrustAssessmentQuestion,
  OneTrustAssessmentSection,
  OneTrustGetRiskResponse,
} from '@transcend-io/privacy-types';

/**
 * Pull configuration from OneTrust down locally to disk
 *
 * Dev Usage:
 * yarn ts-node ./src/cli-sync-ot.ts --hostname=customer.my.onetrust.com --auth=$ONE_TRUST_OAUTH_TOKEN --file=./oneTrustAssessment.json
 *
 * Standard usage
 * yarn cli-sync-ot --hostname=customer.my.onetrust.com --auth=$ONE_TRUST_OAUTH_TOKEN --file=./oneTrustAssessment.json
 */
async function main(): Promise<void> {
  const { file, fileFormat, hostname, auth, resource, debug } =
    parseCliSyncOtArguments();

  try {
    // TODO: move to helper function
    if (resource === OneTrustPullResource.Assessments) {
      // use the hostname and auth token to instantiate a client to talk to OneTrust
      const oneTrust = createOneTrustGotInstance({ hostname, auth });

      // fetch the list of all assessments in the OneTrust organization
      const assessments = await getListOfOneTrustAssessments({ oneTrust });

      /**
       * fetch details about one assessment in series and push to transcend or write to disk
       * (depending on the dryRun argument) right away to avoid running out of memory
       */
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
        let riskDetails: OneTrustGetRiskResponse[] = [];
        const riskIds = uniq(
          assessmentDetails.sections.flatMap((s: OneTrustAssessmentSection) =>
            s.questions.flatMap((q: OneTrustAssessmentQuestion) =>
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
            (riskId) => getOneTrustRisk({ oneTrust, riskId: riskId as string }),
            {
              concurrency: 5,
            },
          );
        }

        // TODO: create a helper for this
        // enrich the sections with risk details
        const riskDetailsById = keyBy(riskDetails, 'id');
        const { sections, ...restAssessmentDetails } = assessmentDetails;
        const sectionsWithEnrichedRisk = sections.map((section) => {
          const { questions, ...restSection } = section;
          const enrichedQuestions = questions.map((question) => {
            const { risks, ...restQuestion } = question;
            const enrichedRisks = (risks ?? []).map((risk) => {
              const details = riskDetailsById[risk.riskId];
              // TODO: missing the risk meta data and links to the assessment
              return {
                ...risk,
                description: details.description,
                name: details.name,
                treatment: details.treatment,
                treatmentStatus: details.treatmentStatus,
                type: details.type,
                state: details.state,
                stage: details.stage,
                result: details.result,
                categories: details.categories,
              };
            });
            return {
              ...restQuestion,
              risks: enrichedRisks,
            };
          });
          return {
            ...restSection,
            questions: enrichedQuestions,
          };
        });

        // combine the two assessments into a single enriched result
        const assessmentWithEnrichedRisk = {
          ...restAssessmentDetails,
          sections: sectionsWithEnrichedRisk,
        };

        writeOneTrustAssessment({
          assessment: {
            ...assessment,
            ...assessmentWithEnrichedRisk,
          },
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
