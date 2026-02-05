import type { Processor } from "../processors/processor.js";
import type { ExecutionContext } from "../context/execution-context.js";
import type { AnalysisSession } from "../session/analysis-session.js";
import type { LintRuleConfig } from "./lint-rule-config.js";

export class LintAnnotateProcessor implements Processor {
    readonly name: string;
    readonly phase = "annotate" as const;

    constructor(private readonly ruleConfig: LintRuleConfig) {
        this.name = `lint-annotate:${ruleConfig.rule.id}`;
    }

    async run(_ctx: ExecutionContext, session: AnalysisSession): Promise<void> {
        const { rule, options } = this.ruleConfig;

        if (!rule.annotate) {
            return;
        }

        for (const node of session.graph.getNodes()) {
            const result = rule.annotate(node, options);

            if (result !== undefined) {
                session.setAnnotation(node.id, `lint.${rule.id}`, result);
            }
        }
    }
}
