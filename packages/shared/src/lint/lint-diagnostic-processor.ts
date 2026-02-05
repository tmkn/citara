import type { ExecutionContext } from "../context/execution-context.js";
import type { Processor } from "../processors/processor.js";
import type { AnalysisSession } from "../session/analysis-session.js";
import { lintRuleAnnotation } from "./lint-annotations.js";
import { lintAnnotateDependencies } from "./lint-processor-utils.js";
import type { LintRuleConfig } from "./lint-rule-config.js";

export class LintDiagnosticProcessor implements Processor {
    readonly name = "lint-diagnostics";
    readonly dependsOn: string[];

    constructor(private readonly ruleConfigs: readonly LintRuleConfig[]) {
        this.dependsOn = lintAnnotateDependencies(ruleConfigs);
    }

    async run(ctx: ExecutionContext, session: AnalysisSession): Promise<void> {
        for (const node of session.graph.getNodes()) {
            for (const config of this.ruleConfigs) {
                const data = session.getAnnotation(node.id, lintRuleAnnotation(config.rule.id).key);

                const result = config.rule.check(node, { params: config.params, data });

                if (result !== undefined) {
                    const findings = Array.isArray(result) ? result : [result];

                    for (const finding of findings) {
                        const isString = typeof finding === "string";

                        session.addDiagnostic({
                            ruleId: config.rule.id,
                            nodeId: node.id,
                            severity: config.severity,
                            message: isString ? finding : finding.message,
                            metadata: isString ? undefined : finding.metadata,
                        });
                    }
                }
            }
        }
    }
}
