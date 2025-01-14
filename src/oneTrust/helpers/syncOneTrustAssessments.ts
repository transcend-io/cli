import { Got } from 'got/dist/source';
import {
  getListOfOneTrustAssessments,
  getOneTrustAssessment,
  getOneTrustRisk,
} from '../endpoints';
import { map, mapSeries } from 'bluebird';
import { logger } from '../../logger';
import {
  OneTrustAssessmentQuestion,
  OneTrustAssessmentSection,
  OneTrustGetRiskResponse,
} from '@transcend-io/privacy-types';
import uniq from 'lodash/uniq';
import { enrichOneTrustAssessment } from './enrichOneTrustAssessment';
import { writeOneTrustAssessment } from './writeOneTrustAssessment';
import { OneTrustFileFormat } from '../../enums';

export const syncOneTrustAssessments = async ({
  oneTrust,
  file,
  fileFormat,
  dryRun,
}: {
  /** the OneTrust client instance */
  oneTrust: Got;
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

    // enrich the sections with risk details
    const enrichedAssessment = enrichOneTrustAssessment({
      assessment,
      assessmentDetails,
      riskDetails,
    });

    // sync to file
    if (dryRun && file && fileFormat) {
      writeOneTrustAssessment({
        assessment: enrichedAssessment,
        index,
        total: assessments.length,
        file,
        fileFormat,
      });
    }
  });
};
