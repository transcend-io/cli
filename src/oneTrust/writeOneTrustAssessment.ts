import { logger } from '../logger';
import colors from 'colors';
import { OneTrustFileFormat } from '../enums';
import { OneTrustAssessment, OneTrustGetAssessmentResponse } from './types';
import fs from 'fs';
import { flattenOneTrustAssessment } from './flattenOneTrustAssessment';

/**
 * Write the assessment to disk at the specified file path.
 *
 *
 * @param param - information about the assessment to write
 */
export const writeOneTrustAssessment = ({
  file,
  fileFormat,
  assessment,
  assessmentDetails,
  index,
  total,
}: {
  /** The file path to write the assessment to */
  file: string;
  /** The format of the output file */
  fileFormat: OneTrustFileFormat;
  /** The basic assessment */
  assessment: OneTrustAssessment;
  /** The assessment with details  */
  assessmentDetails: OneTrustGetAssessmentResponse;
  /** The index of the assessment being written to the file */
  index: number;
  /** The total amount of assessments that we will write */
  total: number;
}): void => {
  logger.info(
    colors.magenta(
      `Syncing enriched assessment ${
        index + 1
      } of ${total} to file "${file}"...`,
    ),
  );

  // combine the two assessments into a single enriched result
  const enrichedAssessment = {
    ...assessmentDetails,
    ...assessment,
  };

  // For json format
  if (fileFormat === OneTrustFileFormat.Json) {
    // start with an opening bracket
    if (index === 0) {
      fs.writeFileSync(file, '[\n');
    }

    // const stringifiedAssessment = JSON.stringify(enrichedAssessment, null, 2);

    // // Add comma for all items except the last one
    // const comma = index < total - 1 ? ',' : '';

    // // write to file
    // fs.appendFileSync(file, stringifiedAssessment + comma);

    // // end with closing bracket
    // if (index === total - 1) {
    //   fs.appendFileSync(file, ']');
    // }
  } else if (fileFormat === OneTrustFileFormat.Csv) {
    // flatten the json object
    // start with an opening bracket
    if (index === 0) {
      fs.writeFileSync('./oneTrust.json', '[\n');
    }

    const flattened = flattenOneTrustAssessment(enrichedAssessment);
    const stringifiedFlattened = JSON.stringify(flattened, null, 2);

    // const stringifiedAssessment = JSON.stringify(enrichedAssessment, null, 2);

    // Add comma for all items except the last one
    const comma = index < total - 1 ? ',' : '';

    // write to file
    // fs.appendFileSync(file, stringifiedAssessment + comma);
    fs.appendFileSync('./oneTrust.json', stringifiedFlattened + comma);

    // end with closing bracket
    if (index === total - 1) {
      fs.appendFileSync('./oneTrust.json', ']');
    }
  }
};
