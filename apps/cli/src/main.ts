import { TarAnnotateProcessor, TARBALL_FILES } from "@repo/node/processors/tar-annotate";
import { CachedNpmRegistryClient } from "@repo/shared/common/npm-registry-client";
import type { ExecutionContext } from "@repo/shared/context/execution-context";
import { AnalysisEngine } from "@repo/shared/engine/analysis-engine";
import { NpmGraphProcessor } from "@repo/shared/processors/npm-graph-processor";
import { TestAnnotateProcessor } from "@repo/shared/processors/test-annotate";
import type { Reporter } from "@repo/shared/reporters/reporter";
import { AnalysisSession } from "@repo/shared/session/analysis-session";
import { FetchHttpTransport } from "@repo/shared/transport/fetch-http-transport";

import { InteractiveLogger } from "./interactive-logger.js";

class TreeReporter implements Reporter {
    async report(sessions: readonly AnalysisSession[]): Promise<void> {
        const [react1, react2] = sessions;

        if (react1 && react2) {
            function readFileUtf8(files: Map<string, any>, path: string): string | null {
                const entry = files.get(path);

                if (!entry) return null;
                if (entry.type !== "file") return null;

                return entry.content.toString("utf-8");
            }

            const packageJson1 = JSON.parse(
                readFileUtf8(
                    react1.requireAnnotation(react1.graph.getRoot().id, TARBALL_FILES.key)!,
                    "package.json",
                )!,
            );

            const packageJson2 = JSON.parse(
                readFileUtf8(
                    react2.requireAnnotation(react2.graph.getRoot().id, TARBALL_FILES.key)!,
                    "package.json",
                )!,
            );

            console.log(packageJson1.version, packageJson2.version);
        }
    }
}

const ctx: ExecutionContext = {
    http: new FetchHttpTransport(),
    logger: new InteractiveLogger(),
};

const registryClient = new CachedNpmRegistryClient();

const sessionReact16 = new AnalysisSession({
    meta: {
        target: "react",
        requested: "16.14.0",
        resolvedVersion: null,
        configHash: "dev",
        timestamp: Date.now(),
    },
    processors: [
        new NpmGraphProcessor(registryClient),
        new TestAnnotateProcessor(),
        new TarAnnotateProcessor(registryClient),
    ],
});

const session = new AnalysisSession({
    meta: {
        target: "react",
        requested: "latest",
        resolvedVersion: null,
        configHash: "dev",
        timestamp: Date.now(),
    },
    processors: [
        new NpmGraphProcessor(registryClient),
        new TestAnnotateProcessor(),
        new TarAnnotateProcessor(registryClient),
    ],
});

const engine = new AnalysisEngine([new TreeReporter()]);

await engine.run(ctx, [session, sessionReact16]);
