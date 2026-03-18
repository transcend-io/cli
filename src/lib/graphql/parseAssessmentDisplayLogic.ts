import {
  AssessmentsDisplayLogicAction,
  ComparisonOperator,
  LogicOperator,
} from '@transcend-io/privacy-types';
import { decodeCodec, valuesOf } from '@transcend-io/type-utils';
import * as t from 'io-ts';

// This codec is for rules that logically require a list of values to compare against.
export const AssessmentRuleWithOperands = t.type({
  dependsOnQuestionReferenceId: t.string,
  comparisonOperator: t.union([
    t.literal(ComparisonOperator.IsEqualTo),
    t.literal(ComparisonOperator.IsNotEqualTo),
    t.literal(ComparisonOperator.IsOneOf),
    t.literal(ComparisonOperator.IsNotOneOf),
    t.literal(ComparisonOperator.Contains),
  ]),
  comparisonOperands: t.array(t.string),
});

// This codec is for the specific rule that does NOT require comparison operands.
export const AssessmentRuleWithoutOperands = t.type({
  dependsOnQuestionReferenceId: t.string,
  comparisonOperator: t.union([
    t.literal(ComparisonOperator.IsNotShown),
    t.literal(ComparisonOperator.IsShown),
  ]),
});

/**
 * The final, flexible codec that accepts EITHER a rule with operands OR a rule without them.
 */
export const AssessmentRule = t.union([
  AssessmentRuleWithOperands,
  AssessmentRuleWithoutOperands,
]);
/** Type override */
export type AssessmentRule = t.TypeOf<typeof AssessmentRule>;

export interface AssessmentNestedRule {
  /** The operator to use when comparing the nested rules */
  logicOperator: LogicOperator;
  /** The rules to evaluate and be compared with to other using the LogicOperator */
  rules?: AssessmentRule[];
  /** The nested rules to add one more level of nesting to the rules. They are also compared to each other. */
  nestedRules?: AssessmentNestedRule[];
}

export const AssessmentNestedRule: t.RecursiveType<
  t.Type<AssessmentNestedRule>
> = t.recursion('AssessmentNestedRule', (self) =>
  t.intersection([
    t.type({
      /** The operator to use when comparing the nested rules */
      logicOperator: valuesOf(LogicOperator),
    }),
    t.partial({
      /** The rules to evaluate and be compared with to other using the LogicOperator */
      rules: t.array(AssessmentRule),
      /** The nested rules to add one more level of nesting to the rules. They are also compared to each other. */
      nestedRules: t.array(self),
    }),
  ]),
);

export const AssessmentAction = t.partial({
  action: valuesOf(AssessmentsDisplayLogicAction),
  rule: AssessmentRule,
  nestedRule: AssessmentNestedRule,
});

/** Type override */
export type AssessmentAction = t.TypeOf<typeof AssessmentAction>;

/**
 * Parse the assessment display logic
 *
 * @param displayLogic - Stringified rule
 * @returns The parsed assessment display logic
 */
export function parseAssessmentDisplayLogic(
  displayLogic: string,
): AssessmentAction {
  return decodeCodec(AssessmentAction, displayLogic);
}
