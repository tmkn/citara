import type { LintRule } from "./lint-rule.js";

export function defineRule<TParams = void, TData = void>(
    rule: LintRule<TParams, TData>,
): LintRule<TParams, TData> {
    return rule;
}
