import type { Processor } from "../processors/processor.js";
import type { ExecutionContext } from "../context/execution-context.js";
import type { AnalysisSession } from "../session/analysis-session.js";
import type { LintRuleConfig } from "./lint-rule-config.js";
import { lintRuleAnnotation } from "./lint-annotations.js";

export class LintDiagnosticProcessor implements Processor {
    readonly name = "lint-diagnostics";
    readonly phase = "diagnostics";

    constructor(private readonly ruleConfigs: readonly LintRuleConfig<any>[]) {}

    async run(ctx: ExecutionContext, session: AnalysisSession): Promise<void> {
        for (const node of session.graph.getNodes()) {
            for (const config of this.ruleConfigs) {
                const data = session.getAnnotation(node.id, lintRuleAnnotation(config.rule.id).key);

                const result = config.rule.check(node, { params: config.params, data });

                if (result !== undefined) {
                    const messages = Array.isArray(result) ? result : [result];

                    for (const message of messages) {
                        session.addDiagnostic({
                            ruleId: config.rule.id,
                            nodeId: node.id,
                            severity: config.severity,
                            message,
                        });
                    }
                }
            }
        }
    }
}
