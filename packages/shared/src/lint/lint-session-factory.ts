import { AnalysisSession } from "../session/analysis-session.js";
import { NpmGraphProcessor } from "../processors/npm-graph-processor.js";
import { LintAnnotateProcessor } from "./lint-annotate-processor.js";
import type { LintRuleConfig } from "./lint-rule-config.js";

export interface LintTargetMeta {
    target: string;
    requested: string;
    depth?: number;
}

export class LintSessionFactory {
    createSessions(
        target: LintTargetMeta,
        ruleConfigs: readonly LintRuleConfig[],
    ): AnalysisSession[] {
        return ruleConfigs.map((ruleConfig) => {
            return new AnalysisSession({
                meta: {
                    target: target.target,
                    requested: target.requested,
                    resolvedVersion: null,
                    configHash: ruleConfig.rule.id,
                    timestamp: Date.now(),
                    depth: target.depth,
                },
                processors: [new NpmGraphProcessor(), new LintAnnotateProcessor(ruleConfig)],
            });
        });
    }
}
