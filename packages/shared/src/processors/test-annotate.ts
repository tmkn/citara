import type { ExecutionContext } from "../context/execution-context.js";
import type { AnalysisSession } from "../session/analysis-session.js";
import { defineAnnotation } from "../session/annotation-key.js";
import type { Processor } from "./processor.js";

export const TEST_ANNOTATE = defineAnnotation<number>(
    "test.annotate",
    (value): value is number => typeof value === "number",
);

export class TestAnnotateProcessor implements Processor {
    readonly name = "test-annotate";
    readonly dependsOn = ["npm-graph"];

    async run(ctx: ExecutionContext, session: AnalysisSession): Promise<void> {
        const graph = session.graph;

        for (const node of graph.getNodes()) {
            ctx.logger.info(`Annotating node: ${node.id}`);
            TEST_ANNOTATE.set(session, node.id, 1337);
        }
    }
}
