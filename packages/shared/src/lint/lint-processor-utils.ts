import type { LintRuleConfig } from "./lint-rule-config.js";

const LINT_ANNOTATE_PREFIX = "lint-annotate";

export function lintAnnotateProcessorName(ruleId: string): string {
    return `${LINT_ANNOTATE_PREFIX}:${ruleId}`;
}

export function rulesWithAnnotate(
    ruleConfigs: readonly LintRuleConfig[],
): readonly LintRuleConfig[] {
    return ruleConfigs.filter((c) => c.rule.annotate);
}

export function lintAnnotateDependencies(ruleConfigs: readonly LintRuleConfig[]): string[] {
    return rulesWithAnnotate(ruleConfigs).map((config) =>
        lintAnnotateProcessorName(config.rule.id),
    );
}
