import type { LintRule } from "./lint-rule.js";

export function defineLintRule<TParams = void, TData = void>(
    rule: LintRule<TParams, TData>,
): LintRule<TParams, TData> {
    return rule;
}
