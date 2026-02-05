import { AnalysisSession } from "../session/analysis-session.js";
import { NpmGraphProcessor } from "../processors/npm-graph-processor.js";
import { LintAnnotateProcessor } from "./lint-annotate-processor.js";
import { LintDiagnosticProcessor } from "./lint-diagnostic-processor.js";
import type { LintRuleConfig } from "./lint-rule-config.js";
import { CachedNpmRegistryClient } from "../common/npm-registry-client.js";

export interface LintTargetMeta {
    target: string;
    requested: string;
    depth?: number;
}

export class LintSessionFactory {
    createSessions(
        target: LintTargetMeta,
        ruleConfigs: readonly LintRuleConfig<any>[],
    ): AnalysisSession[] {
        const annotateProcessors = ruleConfigs
            .filter((config) => config.rule.annotate)
            .map((config) => new LintAnnotateProcessor(config));

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
