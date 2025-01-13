import { createDefaultCodec } from '../helpers';
import { OneTrustCombinedAssessmentCodec } from './codecs';
import { flattenOneTrustAssessment } from './flattenOneTrustAssessment';

/**
 * An object with default values of type OneTrustCombinedAssessmentCodec. It's very
 * valuable when converting assessments to CSV. When we flatten it, the resulting
 * value always contains all keys that eventually we add to the header.
 */
const DEFAULT_ONE_TRUST_COMBINED_ASSESSMENT: OneTrustCombinedAssessmentCodec =
  createDefaultCodec(OneTrustCombinedAssessmentCodec);

export const DEFAULT_ONE_TRUST_ASSESSMENT_CSV_KEYS = Object.keys(
  flattenOneTrustAssessment(DEFAULT_ONE_TRUST_COMBINED_ASSESSMENT),
);
