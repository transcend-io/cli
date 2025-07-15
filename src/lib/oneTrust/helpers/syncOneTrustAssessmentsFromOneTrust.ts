import type { Got } from 'got';
import colors from 'colors';
import {
  getListOfOneTrustAssessments,
  getOneTrustAssessment,
  getOneTrustRisk,
  getOneTrustUser,
} from '../endpoints';
import { mapSeries, map } from '../../bluebird-replace';
import { logger } from '../../../logger';
import {
  OneTrustAssessmentQuestion,
  OneTrustAssessmentSection,
  OneTrustEnrichedAssessment,
  OneTrustGetRiskResponse,
  OneTrustGetUserResponse,
} from '@transcend-io/privacy-types';
import { uniq } from 'lodash-es';
import { enrichOneTrustAssessment } from './enrichOneTrustAssessment';
import { syncOneTrustAssessmentToDisk } from './syncOneTrustAssessmentToDisk';
import { GraphQLClient } from 'graphql-request';
import { syncOneTrustAssessmentToTranscend } from './syncOneTrustAssessmentToTranscend';

export interface AssessmentForm {
  /** ID of Assessment Form */
  id: string;
  /** Title of Assessment Form */
  name: string;
}

/**
 * Reads all the assessments from a OneTrust instance and syncs them to Transcend or to Disk.
 *
 * @param param - the information about the assessment, its OneTrust source, and destination (disk or Transcend)
 */
export const syncOneTrustAssessmentsFromOneTrust = async ({
  oneTrust,
  file,
  dryRun,
  transcend,
}: {
  /** the OneTrust client instance */
  oneTrust: Got;
  /** the Transcend client instance */
  transcend?: GraphQLClient;
  /** Whether to write to file instead of syncing to Transcend */
  dryRun: boolean;
  /** the path to the file in case dryRun is true */
  file?: string;
}): Promise<void> => {
  // fetch the list of all assessments in the OneTrust organization
  logger.info('Getting list of all assessments from OneTrust...');
  const assessments = await getListOfOneTrustAssessments({ oneTrust });

  // a cache of OneTrust users so we avoid requesting already fetched users
  const oneTrustCachedUsers: Record<string, OneTrustGetUserResponse> = {};

  // split all assessments in batches, so we can process some of steps in parallel
  const BATCH_SIZE = 5;
  const assessmentBatches = Array.from(
    {
      length: Math.ceil(assessments.length / BATCH_SIZE),
    },
    (_, i) => assessments.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE),
  );

  // process each batch and sync the batch right away so it's garbage collected and we don't run out of memory
  await mapSeries(assessmentBatches, async (assessmentBatch, batch) => {
    const batchEnrichedAssessments: OneTrustEnrichedAssessment[] = [];

    // fetch assessment details from OneTrust in parallel
    await map(
      assessmentBatch,
      async (assessment, index) => {
        const assessmentNumber = BATCH_SIZE * batch + index + 1;
        logger.info(
          `[assessment ${assessmentNumber} of ${assessments.length}]: fetching details...`,
        );
        const { templateName, assessmentId } = assessment;
        const assessmentDetails = await getOneTrustAssessment({
          oneTrust,
          assessmentId,
        });
        // fetch assessment's creator information
        const creatorId = assessmentDetails.createdBy.id;
        let creator = oneTrustCachedUsers[creatorId];
        if (!creator) {
          logger.info(
            `[assessment ${assessmentNumber} of ${assessments.length}]: fetching creator...`,
          );
          try {
            creator = await getOneTrustUser({
              oneTrust,
              userId: creatorId,
            });
            oneTrustCachedUsers[creatorId] = creator;
          } catch (e) {
            logger.warn(
              colors.yellow(
                `[assessment ${assessmentNumber} of ${assessments.length}]: failed to fetch form creator.` +
                  `\tcreatorId: ${creatorId}. Assessment Title: ${assessment.name}. Template Title: ${templateName}`,
              ),
            );
          }
        }

        // fetch assessment approvers information
        const { approvers } = assessmentDetails;
        let approversDetails: OneTrustGetUserResponse[][] = [];
        if (approvers.length > 0) {
          logger.info(
            `[assessment ${assessmentNumber} of ${assessments.length}]: fetching approvers...`,
          );
          approversDetails = await map(
            approvers.map(({ id }) => id),
            async (userId) => {
              try {
                let approver = oneTrustCachedUsers[userId];
                if (!approver) {
                  approver = await getOneTrustUser({ oneTrust, userId });
                  oneTrustCachedUsers[userId] = approver;
                }
                return [approver];
              } catch (e) {
                logger.warn(
                  colors.yellow(
                    `[assessment ${assessmentNumber} of ${assessments.length}]: failed to fetch a form approver.` +
                      `\tapproverId: ${userId}. Assessment Title: ${assessment.name}. Template Title: ${templateName}`,
                  ),
                );
                return [];
              }
            },
            { concurrency: 5 },
          );
        }

        // fetch assessment internal respondents information
        const { respondents } = assessmentDetails;
        // if a user is an internal respondents, their 'name' field can't be an email.
        const internalRespondents = respondents.filter(
          (r) => !r.name.includes('@'),
        );
        let respondentsDetails: OneTrustGetUserResponse[][] = [];
        if (internalRespondents.length > 0) {
          logger.info(
            `[assessment ${assessmentNumber} of ${assessments.length}]: fetching respondents...`,
          );
          respondentsDetails = await map(
            internalRespondents.map(({ id }) => id),
            async (userId) => {
              try {
                let respondent = oneTrustCachedUsers[userId];
                if (!respondent) {
                  respondent = await getOneTrustUser({ oneTrust, userId });
                  oneTrustCachedUsers[userId] = respondent;
                }
                return [respondent];
              } catch (e) {
                logger.warn(
                  colors.yellow(
                    `[assessment ${assessmentNumber} of ${assessments.length}]: failed to fetch a respondent.` +
                      `\trespondentId: ${userId}. Assessment Title: ${assessment.name}. Template Title: ${templateName}`,
                  ),
                );
                return [];
              }
            },
            { concurrency: 5 },
          );
        }

        // fetch assessment risk information
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
            `[assessment ${assessmentNumber} of ${assessments.length}]: fetching risks...`,
          );
          riskDetails = await map(
            riskIds,
            (riskId) => getOneTrustRisk({ oneTrust, riskId: riskId as string }),
            {
              concurrency: 5,
            },
          );
        }

        // enrich the assessments with user and risk details
        const enrichedAssessment = enrichOneTrustAssessment({
          assessment,
          assessmentDetails,
          riskDetails,
          creatorDetails: creator,
          approversDetails: approversDetails.flat(),
          respondentsDetails: respondentsDetails.flat(),
        });

        batchEnrichedAssessments.push(enrichedAssessment);
      },
      { concurrency: BATCH_SIZE },
    );

    // sync assessments in series to avoid concurrency bugs
    await mapSeries(
      batchEnrichedAssessments,
      async (enrichedAssessment, index) => {
        // the assessment's global index takes its batch into consideration
        const globalIndex = batch * BATCH_SIZE + index;

        if (dryRun && file) {
          // sync to file
          syncOneTrustAssessmentToDisk({
            assessment: enrichedAssessment,
            index: globalIndex,
            total: assessments.length,
            file,
          });
        } else if (transcend) {
          // sync to transcend
          await syncOneTrustAssessmentToTranscend({
            assessment: enrichedAssessment,
            transcend,
            total: assessments.length,
            index: globalIndex,
          });
        }
      },
    );
  });
};
