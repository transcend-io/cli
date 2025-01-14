import { createDefaultCodec } from '@transcend-io/type-utils';
import { OneTrustCombinedAssessment } from './codecs';
import { flattenOneTrustAssessment } from './flattenOneTrustAssessment';

/**
 * An object with default values of type OneTrustCombinedAssessment. It's very
 * valuable when converting assessments to CSV, as it contains all keys that
 * make up the CSV header in the expected order
 */
const DEFAULT_ONE_TRUST_COMBINED_ASSESSMENT: OneTrustCombinedAssessment =
  createDefaultCodec(OneTrustCombinedAssessment);

/** The header of the OneTrust ASsessment CSV file */
export const DEFAULT_ONE_TRUST_ASSESSMENT_CSV_HEADER = Object.keys(
  flattenOneTrustAssessment(DEFAULT_ONE_TRUST_COMBINED_ASSESSMENT),
);
