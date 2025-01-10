import { Got } from 'got';
import { logger } from '../logger';
import {
  OneTrustAssessmentCodec,
  OneTrustGetListOfAssessmentsResponseCodec,
} from './codecs';
import { decodeCodec } from '@transcend-io/type-utils';

/**
 * Fetch a list of all assessments from the OneTrust client.
 * ref: https://developer.onetrust.com/onetrust/reference/getallassessmentbasicdetailsusingget
 *
 * @param param - the information about the OneTrust client
 * @returns a list of OneTrustAssessment
 */
export const getListOfOneTrustAssessments = async ({
  oneTrust,
}: {
  /** The OneTrust client instance */
  oneTrust: Got;
}): Promise<OneTrustAssessmentCodec[]> => {
  let currentPage = 0;
  let totalPages = 1;
  let totalElements = 0;

  const allAssessments: OneTrustAssessmentCodec[] = [];

  logger.info('Getting list of all assessments from OneTrust...');
  while (currentPage < totalPages) {
    // eslint-disable-next-line no-await-in-loop
    const { body } = await oneTrust.get(
      `api/assessment/v2/assessments?page=${currentPage}&size=2000`,
    );

    const { page, content } = decodeCodec(
      OneTrustGetListOfAssessmentsResponseCodec,
      body,
    );
    allAssessments.push(...(content ?? []));
    if (currentPage === 0) {
      totalPages = page?.totalPages ?? 0;
      totalElements = page?.totalElements ?? 0;
    }
    currentPage += 1;

    // log progress
    logger.info(
      `Fetched ${allAssessments.length} of ${totalElements} assessments.`,
    );
  }

  return allAssessments;
};
