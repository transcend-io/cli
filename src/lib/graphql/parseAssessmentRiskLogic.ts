import { ComparisonOperator } from '@transcend-io/privacy-types';
import { decodeCodec, valuesOf } from '@transcend-io/type-utils';
import * as t from 'io-ts';

export const AssessmentRiskLogic = t.intersection([
  t.partial({
    riskAssignment: t.partial({
      riskLevelId: t.string,
      riskMatrixRowId: t.string,
      riskMatrixColumnId: t.string,
    }),
  }),
  t.type({
    comparisonOperands: t.array(t.string),
    comparisonOperator: valuesOf(ComparisonOperator),
  }),
]);

/** Type override */
export type AssessmentRiskLogic = t.TypeOf<typeof AssessmentRiskLogic>;

/**
 * Parse the assessment risk logic
 *
 * @param riskLogic - Stringified rule
 * @returns The parsed assessment risk logic
 */
export function parseAssessmentRiskLogic(
  riskLogic: string,
): AssessmentRiskLogic {
  return decodeCodec(AssessmentRiskLogic, riskLogic);
}
