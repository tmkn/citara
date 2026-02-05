import type { ExecutionContext } from "../context/execution-context.js";
import type { Processor } from "../processors/processor.js";
import type { AnalysisSession } from "../session/analysis-session.js";
import { lintRuleAnnotation } from "./lint-annotations.js";
import { lintAnnotateProcessorName } from "./lint-processor-utils.js";
import type { LintRuleConfig } from "./lint-rule-config.js";

export class LintAnnotateProcessor implements Processor {
    readonly name: string;
    readonly dependsOn = ["npm-graph"];

    constructor(private readonly ruleConfig: LintRuleConfig) {
        this.name = lintAnnotateProcessorName(ruleConfig.rule.id);
    }

    async run(ctx: ExecutionContext, session: AnalysisSession): Promise<void> {
        const { rule, params } = this.ruleConfig;

        if (!rule.annotate) return;

        for (const node of session.graph.getNodes()) {
            try {
                const result = rule.annotate(node, params);
                if (result !== undefined) {
                    session.setAnnotation(node.id, lintRuleAnnotation(rule.id).key, result);
                }
            } catch (err) {
                ctx.logger.error(`[${this.name}] Failed to annotate node ${node.id}: ${err}`);

                throw new Error("Lint Annotate Processor failed", { cause: err });
            }
        }
    }
}
