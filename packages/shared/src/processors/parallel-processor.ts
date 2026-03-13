import pLimit from "p-limit";

import type { ExecutionContext } from "@repo/shared/context/execution-context";
import type { Processor } from "@repo/shared/processors/processor";
import type { AnalysisSession } from "@repo/shared/session/analysis-session";

import type { PackageNode } from "../graph/package-node.js";

export abstract class ParallelProcessor implements Processor {
    abstract readonly name: string;
    abstract readonly dependsOn: string[];

    protected concurrencyLimit = 5;

    async run(ctx: ExecutionContext, session: AnalysisSession): Promise<void> {
        const limit = pLimit(this.concurrencyLimit);
        const graph = session.graph;

        const tasks = Array.from(graph.getNodes()).map((node) =>
            limit(() => this.processNode(node, ctx, session)),
        );

        await Promise.all(tasks);
    }

    protected abstract processNode(
        node: PackageNode,
        ctx: ExecutionContext,
        session: AnalysisSession,
    ): Promise<void>;
}
