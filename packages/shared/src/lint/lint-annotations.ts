import { defineAnnotation } from "../session/annotation-key.js";
import type { LintResult } from "./lint-result.js";

const cache = new Map<string, ReturnType<typeof defineAnnotation<any>>>();

export function lintRuleAnnotation(ruleId: string) {
    let key = cache.get(ruleId);

    if (!key) {
        key = defineAnnotation<LintResult>(`lint.${ruleId}`);
        cache.set(ruleId, key);
    }

    return key;
}
