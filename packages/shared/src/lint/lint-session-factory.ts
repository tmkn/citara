import { CachedNpmRegistryClient } from "../common/npm-registry-client.js";
import { NpmGraphProcessor } from "../processors/npm-graph-processor.js";
import { AnalysisSession } from "../session/analysis-session.js";
import { LintAnnotateProcessor } from "./lint-annotate-processor.js";
import { LintDiagnosticProcessor } from "./lint-diagnostic-processor.js";
import { rulesWithAnnotate } from "./lint-processor-utils.js";
import type { LintRuleConfig } from "./lint-rule-config.js";
import type { LintRule } from "./lint-rule.js";

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
        const annotateProcessors = rulesWithAnnotate(ruleConfigs).map(
            (config) => new LintAnnotateProcessor(config),
        );

        const registryClient = new CachedNpmRegistryClient();

        return [
            new AnalysisSession({
                meta: {
                    target: target.target,
                    requested: target.requested,
                    resolvedVersion: null,
                    configHash: "lint-run",
                    timestamp: Date.now(),
                    depth: target.depth,
                },
                processors: [
                    new NpmGraphProcessor(registryClient),
                    ...annotateProcessors,
                    new LintDiagnosticProcessor(ruleConfigs),
                ],
            }),
        ];
    }
}
