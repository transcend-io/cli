import { logger } from '../logger';
import colors from 'colors';
import { OneTrustFileFormat } from '../enums';
import fs from 'fs';
import { flattenOneTrustAssessment } from './flattenOneTrustAssessment';
import { DEFAULT_ONE_TRUST_ASSESSMENT_CSV_HEADER } from './constants';
import { decodeCodec } from '@transcend-io/type-utils';
import {
  OneTrustAssessmentCsvRecord,
  OneTrustGetRiskResponse,
} from '@transcend-io/privacy-types';
import { OneTrustCombinedAssessment } from './codecs';

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
  index,
  total,
}: {
  /** The file path to write the assessment to */
  file: string;
  /** The format of the output file */
  fileFormat: OneTrustFileFormat;
  /** The basic assessment */
  assessment: OneTrustCombinedAssessment;
  /** The details of risks found within the assessment */
  riskDetails: OneTrustGetRiskResponse[];
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

  // For json format
  if (fileFormat === OneTrustFileFormat.Json) {
    // start with an opening bracket
    if (index === 0) {
      fs.writeFileSync(file, '[\n');
    }

    const stringifiedAssessment = JSON.stringify(assessment, null, 2);

    // Add comma for all items except the last one
    const comma = index < total - 1 ? ',' : '';

    // write to file
    fs.appendFileSync(file, stringifiedAssessment + comma);

    // end with closing bracket
    if (index === total - 1) {
      fs.appendFileSync(file, ']');
    }
  } else if (fileFormat === OneTrustFileFormat.Csv) {
    const csvRows = [];

    // write csv header at the beginning of the file
    if (index === 0) {
      csvRows.push(DEFAULT_ONE_TRUST_ASSESSMENT_CSV_HEADER.join(','));
    }

    // flatten the assessment object so it does not have nested properties
    const flatAssessment = flattenOneTrustAssessment(assessment);

    // comment
    const flatAssessmentFull = Object.fromEntries(
      DEFAULT_ONE_TRUST_ASSESSMENT_CSV_HEADER.map((header) => {
        const value = flatAssessment[header] ?? '';
        const escapedValue =
          typeof value === 'string' &&
          (value.includes(',') || value.includes('"'))
            ? `"${value.replace(/"/g, '""')}"`
            : value;
        return [header, escapedValue];
      }),
    );

    // ensure the record has the expected type!
    decodeCodec(OneTrustAssessmentCsvRecord, flatAssessmentFull);

    // transform the flat assessment to have all CSV keys in the expected order
    const assessmentRow = Object.values(flatAssessmentFull);

    // append the rows to the file
    csvRows.push(`${assessmentRow.join(',')}\n`);
    fs.appendFileSync('./oneTrust.csv', csvRows.join('\n'));
  }
};
