import { decodeCodec } from '@transcend-io/type-utils';
import { OneTrustEnrichedAssessment } from '../codecs';
import { DEFAULT_ONE_TRUST_ASSESSMENT_CSV_HEADER } from './constants';
import { flattenOneTrustAssessment } from './flattenOneTrustAssessment';
import { OneTrustAssessmentCsvRecord } from '@transcend-io/privacy-types';

/**
 * Converts the assessment into a csv entry.
 *
 * @param param - information about the assessment and amount of entries
 * @returns a stringified csv entry ready to be appended to a file
 */
export const oneTrustAssessmentToCsv = ({
  assessment,
  index,
}: {
  /** The assessment to convert */
  assessment: OneTrustEnrichedAssessment;
  /** The position of the assessment in the final Json object */
  index: number;
}): string => {
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

  return csvRows.join('\n');
};
