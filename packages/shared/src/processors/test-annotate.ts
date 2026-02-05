import type { ExecutionContext } from "../context/execution-context.js";
import type { AnalysisSession } from "../session/analysis-session.js";
import type { Processor } from "./processor.js";

export class TestAnnotateProcessor implements Processor {
    readonly name = "test-annotate";
    readonly phase = "annotate";

    async run(ctx: ExecutionContext, session: AnalysisSession): Promise<void> {
        const graph = session.graph;

        for (const node of graph.getNodes()) {
            ctx.logger.info(`Annotating node: ${node.id}`);
            session.setAnnotation(node.id, "test-annotation", 1337);
        }
    }
}
