import { createDefaultCodec } from '../helpers';
import { OneTrustCombinedAssessmentCodec } from './codecs';

/**
 * An object with default values of type OneTrustCombinedAssessmentCodec. It's very
 * valuable when converting assessments to CSV. When we flatten it, the resulting
 * value always contains all keys that eventually we add to the header.
 */
export const DEFAULT_ONE_TRUST_COMBINED_ASSESSMENT: OneTrustCombinedAssessmentCodec =
  createDefaultCodec(OneTrustCombinedAssessmentCodec);
