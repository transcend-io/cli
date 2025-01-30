import { OneTrustEnrichedAssessment } from '@transcend-io/privacy-types';

/**
 * Converts the assessment into a json entry.
 *
 * @param param - information about the assessment and amount of entries
 * @returns a stringified json entry ready to be appended to a file
 */
export const oneTrustAssessmentToJson = ({
  assessment,
  index,
  total,
  wrap = true,
}: {
  /** The assessment to convert */
  assessment: OneTrustEnrichedAssessment;
  /** The position of the assessment in the final Json object */
  index: number;
  /** The total amount of the assessments in the final Json object */
  total: number;
  /** Whether to wrap every entry in brackets */
  wrap?: boolean;
}): string => {
  let jsonEntry = '';
  // start with an opening bracket
  if (index === 0 || wrap) {
    jsonEntry = '[';
  }

  const stringifiedAssessment = JSON.stringify(assessment);

  // Add comma for all items except the last one
  const comma = index < total - 1 && !wrap ? ',' : '';

  // write to file
  jsonEntry = jsonEntry + stringifiedAssessment + comma;

  // end with closing bracket
  if (index === total - 1 || wrap) {
    jsonEntry += ']';
  }

  return jsonEntry;
};
