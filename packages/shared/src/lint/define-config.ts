import type { LintRuleConfig } from "./lint-rule-config.js";
import type { LintRule } from "./lint-rule.js";

export function defineConfig<TRules extends readonly LintRule<any, any>[]>(configs: {
    [K in keyof TRules]: LintRuleConfig<TRules[K]>;
}) {
    return configs;
}
