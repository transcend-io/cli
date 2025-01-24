import { Got } from 'got/dist/source';
import {
  getListOfOneTrustAssessments,
  getOneTrustAssessment,
  getOneTrustRisk,
  getOneTrustUser,
} from '../endpoints';
import { map, mapSeries } from 'bluebird';
import { logger } from '../../logger';
import {
  OneTrustAssessmentQuestion,
  OneTrustAssessmentSection,
  OneTrustEnrichedAssessment,
  OneTrustGetRiskResponse,
  OneTrustGetUserResponse,
} from '@transcend-io/privacy-types';
import uniq from 'lodash/uniq';
import { enrichOneTrustAssessment } from './enrichOneTrustAssessment';
import { syncOneTrustAssessmentToDisk } from './syncOneTrustAssessmentToDisk';
import { OneTrustFileFormat } from '../../enums';
import { GraphQLClient } from 'graphql-request';
import { syncOneTrustAssessmentToTranscend } from './syncOneTrustAssessmentToTranscend';

export interface AssessmentForm {
  /** ID of Assessment Form */
  id: string;
  /** Title of Assessment Form */
  name: string;
}

export const syncOneTrustAssessments = async ({
  oneTrust,
  file,
  fileFormat,
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
  /** the format of the file in case dryRun is true */
  fileFormat?: OneTrustFileFormat;
}): Promise<void> => {
  // fetch the list of all assessments in the OneTrust organization
  logger.info('Getting list of all assessments from OneTrust...');
  const assessments = await getListOfOneTrustAssessments({ oneTrust });

  // a cache of OneTrust users so we avoid sending requests for users already fetched
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
        const assessmentNumber = BATCH_SIZE * batch + index;
        logger.info(
          `[assessment ${assessmentNumber} of ${assessments.length}]: fetching details...`,
        );
        const assessmentDetails = await getOneTrustAssessment({
          oneTrust,
          assessmentId: assessment.assessmentId,
        });
        // fetch assessment's creator information
        const creatorId = assessmentDetails.createdBy.id;
        let creator = oneTrustCachedUsers[creatorId];
        if (!creator) {
          logger.info(
            `[assessment ${assessmentNumber} of ${assessments.length}]: fetching creator...`,
          );
          creator = await getOneTrustUser({
            oneTrust,
            userId: creatorId,
          });
          oneTrustCachedUsers[creatorId] = creator;
        }

        // fetch assessment approvers information
        const { approvers } = assessmentDetails;
        let approversDetails: OneTrustGetUserResponse[] = [];
        if (approvers.length > 0) {
          logger.info(
            `[assessment ${assessmentNumber} of ${assessments.length}]: fetching approvers...`,
          );
          approversDetails = await map(
            approvers.map(({ id }) => id),
            async (userId) => {
              let approver = oneTrustCachedUsers[userId];
              if (!approver) {
                approver = await getOneTrustUser({ oneTrust, userId });
                oneTrustCachedUsers[userId] = approver;
              }
              return approver;
            },
            { concurrency: 5 },
          );
        }

        // fetch assessment internal respondents information
        const { respondents } = assessmentDetails;
        // internal respondents names are not emails.
        const internalRespondents = respondents.filter(
          (r) => !r.name.includes('@'),
        );
        let respondentsDetails: OneTrustGetUserResponse[] = [];
        if (internalRespondents.length > 0) {
          logger.info(
            `[assessment ${assessmentNumber} of ${assessments.length}]: fetching respondents...`,
          );
          respondentsDetails = await map(
            internalRespondents.map(({ id }) => id),
            async (userId) => {
              let respondent = oneTrustCachedUsers[userId];
              if (!respondent) {
                respondent = await getOneTrustUser({ oneTrust, userId });
                oneTrustCachedUsers[userId] = respondent;
              }
              return respondent;
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
          approversDetails,
          respondentsDetails,
        });

        batchEnrichedAssessments.push(enrichedAssessment);
      },
      { concurrency: BATCH_SIZE },
    );

    // sync assessments in series to avoid concurrency bugs
    await mapSeries(
      batchEnrichedAssessments,
      async (enrichedAssessment, index) => {
        const trueIndex = batch * BATCH_SIZE + index;
        if (dryRun && file && fileFormat) {
          // sync to file
          syncOneTrustAssessmentToDisk({
            assessment: enrichedAssessment,
            index: trueIndex,
            total: assessments.length,
            file,
            fileFormat,
          });
        } else if (fileFormat === OneTrustFileFormat.Csv && transcend) {
          // sync to transcend
          await syncOneTrustAssessmentToTranscend({
            assessment: enrichedAssessment,
            transcend,
          });
        }
      },
    );
  });
};
