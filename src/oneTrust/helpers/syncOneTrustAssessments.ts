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

  // a cache of OneTrust users so we avoid requesting already fetched users
  const oneTrustCachedUsers: Record<string, OneTrustGetUserResponse> = {};

  /**
   * fetch details about each assessment in series and write to transcend or to disk
   * (depending on the dryRun argument) right away to avoid running out of memory
   */
  await mapSeries(assessments, async (assessment, index) => {
    const assessmentNumber = index + 1;
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
    // if a user is an internal respondents, their 'name' field can't be an email.
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

    // the assessment's global index takes its batch into consideration
    if (dryRun && file && fileFormat) {
      // sync to file
      syncOneTrustAssessmentToDisk({
        assessment: enrichedAssessment,
        index,
        total: assessments.length,
        file,
        fileFormat,
      });
    } else if (fileFormat === OneTrustFileFormat.Json && transcend) {
      // sync to transcend
      await syncOneTrustAssessmentToTranscend({
        assessment: enrichedAssessment,
        transcend,
        total: assessments.length,
        index,
      });
    }
  });
};
