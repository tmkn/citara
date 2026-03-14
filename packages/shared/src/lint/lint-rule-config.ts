import type { LintRule } from "./lint-rule.js";

export const ALL_SEVERITIES = ["warn", "error"] as const;
export type LintSeverity = (typeof ALL_SEVERITIES)[number];

export type LintRuleParams<TRule> = TRule extends LintRule<infer TParams, any> ? TParams : never;

export interface LintRuleConfig<TRule extends LintRule<any, any> = LintRule<any, any>> {
    rule: TRule;
    severity: LintSeverity;
    params?: LintRuleParams<TRule>;
}

export function ruleConfig<TRule extends LintRule<any, any>>(
    config: LintRuleParams<TRule> extends void
        ? {
              rule: TRule;
              severity: LintSeverity;
          }
        : {
              rule: TRule;
              severity: LintSeverity;
              params: LintRuleParams<TRule>;
          },
): LintRuleConfig<TRule> {
    return {
        ...config,
        params: ("params" in config ? config.params : undefined) as any,
    };
}
