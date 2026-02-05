import { consoleLogger } from "@repo/shared/context/console-logger";
import type { ExecutionContext } from "@repo/shared/context/execution-context";
import { NpmGraphProcessor } from "@repo/shared/processors/npm-graph-processor";
import { TreeReporter } from "@repo/shared/reporters/tree-reporter";
import { AnalysisSession } from "@repo/shared/session/analysis-session";
import { FetchHttpTransport } from "@repo/shared/transport/fetch-http-transport";

const session = new AnalysisSession({
    meta: {
        target: "react",
        requested: "17.0.2",
        resolvedVersion: null,
        configHash: "dev",
        timestamp: Date.now(),
    },
});

const graphProcessor = new NpmGraphProcessor();

const ctx: ExecutionContext = {
    http: new FetchHttpTransport(),
    logger: consoleLogger,
};

await graphProcessor.run(ctx, session);

const reporter = new TreeReporter();
reporter.report([session]);
