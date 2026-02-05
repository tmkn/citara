import type { ExecutionContext } from "@repo/shared/context/execution-context";
import { NpmGraphProcessor } from "@repo/shared/processors/npm-graph-processor";
import { TreeReporter } from "@repo/shared/reporters/tree-reporter";
import { AnalysisSession } from "@repo/shared/session/analysis-session";
import { FetchHttpTransport } from "@repo/shared/transport/fetch-http-transport";
import { AnalysisEngine } from "@repo/shared/engine/analysis-engine";
import { TestAnnotateProcessor } from "@repo/shared/processors/test-annotate";
import { InteractiveLogger } from "./interactive-logger.js";

const ctx: ExecutionContext = {
    http: new FetchHttpTransport(),
    logger: new InteractiveLogger(),
};

// const sessionReact16 = new AnalysisSession({
//     meta: {
//         target: "react",
//         requested: "16.14.0",
//         resolvedVersion: null,
//         configHash: "dev",
//         timestamp: Date.now(),
//     },
//     processors: [new NpmGraphProcessor(), new TestAnnotateProcessor()],
// });

const session = new AnalysisSession({
    meta: {
        target: "react",
        requested: "latest",
        resolvedVersion: null,
        configHash: "dev",
        timestamp: Date.now(),
    },
    processors: [new NpmGraphProcessor(), new TestAnnotateProcessor()],
});

const engine = new AnalysisEngine([new TreeReporter()]);

await engine.run(ctx, [session]);
