import type { LintRule } from "./lint-rule.js";

export type LintSeverity = "warn" | "error" | "sdf";

const SEVERITY_MAP = {
    warn: true,
    error: true,
} as const;

export const ALL_SEVERITIES = Object.keys(SEVERITY_MAP);

export interface LintRuleConfig<TOptions = unknown> {
    rule: LintRule<TOptions>;
    severity: LintSeverity;
    options: TOptions;
}
