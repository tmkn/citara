import type { Processor } from "../processors/processor.js";
import type { ExecutionContext } from "../context/execution-context.js";
import type { AnalysisSession } from "../session/analysis-session.js";
import type { LintRuleConfig } from "./lint-rule-config.js";
import { lintRuleAnnotation } from "./lint-annotations.js";

export class LintAnnotateProcessor implements Processor {
    readonly name: string;
    readonly phase = "annotate";

    constructor(private readonly ruleConfig: LintRuleConfig<any>) {
        this.name = `lint-annotate:${ruleConfig.rule.id}`;
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
            }
        }
    }
}
