import fs from 'node:fs';
import { OneTrustEnrichedAssessment } from '@transcend-io/privacy-types';
import colors from 'colors';
import { logger } from '../../../logger';
import { oneTrustAssessmentToJson } from './oneTrustAssessmentToJson';

/**
 * Write the assessment to disk at the specified file path.
 *
 *
 * @param param - information about the assessment to write
 */
export const syncOneTrustAssessmentToDisk = ({
  file,
  assessment,
  index,
  total,
}: {
  /** The file path to write the assessment to */
  file: string;
  /** The basic assessment */
  assessment: OneTrustEnrichedAssessment;
  /** The index of the assessment being written to the file */
  index: number;
  /** The total amount of assessments that we will write */
  total: number;
}): void => {
  logger.info(
    colors.magenta(
      `Writing enriched assessment ${
        index + 1
      } of ${total} to file "${file}"...`,
    ),
  );

  if (index === 0) {
    fs.writeFileSync(
      file,
      oneTrustAssessmentToJson({
        assessment,
        index,
        total,
        wrap: false,
      }),
    );
  } else {
    fs.appendFileSync(
      file,
      oneTrustAssessmentToJson({
        assessment,
        index,
        total,
        wrap: false,
      }),
    );
  }
};
