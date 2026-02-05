import type { LintRule } from "./lint-rule.js";

export const ALL_SEVERITIES = ["warn", "error"] as const;
export type LintSeverity = (typeof ALL_SEVERITIES)[number];

export type LintRuleParams<TRule> = TRule extends LintRule<infer TParams, any> ? TParams : never;

export interface LintRuleConfig<TRule extends LintRule<any, any>> {
    rule: TRule;
    severity: LintSeverity;
    params: LintRuleParams<TRule>;
}
