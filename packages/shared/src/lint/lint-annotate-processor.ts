import type { ExecutionContext } from "../context/execution-context.js";
import type { PackageNode } from "../graph/package-node.js";
import { ParallelProcessor } from "../processors/parallel-processor.js";
import type { AnalysisSession } from "../session/analysis-session.js";
import { lintRuleAnnotation } from "./lint-annotations.js";
import { lintAnnotateProcessorName } from "./lint-processor-utils.js";
import type { LintRuleConfig } from "./lint-rule-config.js";
import type { LintRule } from "./lint-rule.js";

export class LintAnnotateProcessor extends ParallelProcessor {
    readonly name: string;
    readonly dependsOn = ["npm-graph"];
    protected override concurrencyLimit = 32;

    constructor(private readonly ruleConfig: LintRuleConfig<LintRule<any, any>>) {
        super();
        this.name = lintAnnotateProcessorName(ruleConfig.rule.id);
    }

    protected async processNode(
        node: PackageNode,
        ctx: ExecutionContext,
        session: AnalysisSession,
    ): Promise<void> {
        const { rule, params } = this.ruleConfig;

        if (!rule.annotate) return;

        try {
            ctx.logger.info(`Annotating ${node.id}`);
            const result = await rule.annotate(node, params);
            if (result !== undefined) {
                session.setAnnotation(node.id, lintRuleAnnotation(rule.id).key, result);
            }
        } catch (err) {
            ctx.logger.error(`Failed to annotate node ${node.id}: ${err}`);

            throw new Error("Lint Annotate Processor failed", { cause: err });
        }
    }
}
