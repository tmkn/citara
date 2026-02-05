import { describe, test, expect, vi } from "vitest";

import { NpmGraphProcessor } from "../src/processors/npm-graph-processor.js";
import { AnalysisSession } from "../src/session/analysis-session.js";
import type { ExecutionContext } from "../src/context/execution-context.js";
import type { HttpTransport } from "../src/context/http-transport.js";
import type { Logger } from "../src/context/logger.js";
import type { HttpRequest } from "../src/transport/http-request.js";
import type { HttpResponse } from "../src/transport/http-response.js";

const mockManifests: Record<string, any> = {
    root: {
        name: "root",
        versions: {
            "1.0.0": {
                name: "root",
                version: "1.0.0",
                dependencies: {
                    dep1: "^1.0.0",
                },
                devDependencies: {
                    devDep1: "^1.0.0",
                },
            },
        },
    },
    dep1: {
        name: "dep1",
        versions: {
            "1.0.0": {
                name: "dep1",
                version: "1.0.0",
                dependencies: {
                    dep2: "^1.0.0",
                },
            },
        },
    },
    dep2: {
        name: "dep2",
        versions: {
            "1.0.0": {
                name: "dep2",
                version: "1.0.0",
                dependencies: {},
            },
        },
    },
    devDep1: {
        name: "devDep1",
        versions: {
            "1.0.0": {
                name: "devDep1",
                version: "1.0.0",
                dependencies: {},
                devDependencies: {
                    devDep2: "^1.0.0",
                },
            },
        },
    },
    devDep2: {
        name: "devDep2",
        versions: {
            "1.0.0": {
                name: "devDep2",
                version: "1.0.0",
                dependencies: {},
            },
        },
    },
};

const mockHttp: HttpTransport = {
    request: async (req: HttpRequest): Promise<HttpResponse> => {
        const name = req.url.split("/").pop()!;
        const metadata = mockManifests[name];
        if (!metadata) {
            return { status: 404, body: "{}" };
        }
        return { status: 200, body: JSON.stringify(metadata) };
    },
};

const mockLogger: Logger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
};

const ctx: ExecutionContext = {
    http: mockHttp,
    logger: mockLogger,
};

describe("NpmGraphProcessor", () => {
    test("resolves full tree by default", async () => {
        const processor = new NpmGraphProcessor();
        const session = new AnalysisSession({
            meta: {
                target: "root",
                requested: "1.0.0",
                resolvedVersion: null,
                configHash: "test",
                timestamp: Date.now(),
            },
            processors: [processor],
        });

        await processor.run(ctx, session);

        const graph = session.graph;
        expect(graph.hasNode("root@1.0.0")).toBe(true);
        expect(graph.hasNode("dep1@1.0.0")).toBe(true);
        expect(graph.hasNode("dep2@1.0.0")).toBe(true);
        expect(graph.hasNode("devDep1@1.0.0")).toBe(false);
    });

    test("resolves tree with depth 1", async () => {
        const processor = new NpmGraphProcessor();
        const session = new AnalysisSession({
            meta: {
                target: "root",
                requested: "1.0.0",
                resolvedVersion: null,
                configHash: "test",
                timestamp: Date.now(),
                depth: 1,
            },
            processors: [processor],
        });

        await processor.run(ctx, session);

        const graph = session.graph;
        expect(graph.hasNode("root@1.0.0")).toBe(true);
        expect(graph.hasNode("dep1@1.0.0")).toBe(true);
        expect(graph.hasNode("dep2@1.0.0")).toBe(false);
    });

    test("resolves tree with depth 0", async () => {
        const processor = new NpmGraphProcessor();
        const session = new AnalysisSession({
            meta: {
                target: "root",
                requested: "1.0.0",
                resolvedVersion: null,
                configHash: "test",
                timestamp: Date.now(),
                depth: 0,
            },
            processors: [processor],
        });

        await processor.run(ctx, session);

        const graph = session.graph;
        expect(graph.hasNode("root@1.0.0")).toBe(true);
        expect(graph.hasNode("dep1@1.0.0")).toBe(false);
        // expect(graph.hasNode("dep2@1.0.0")).toBe(false);
    });

    test("resolves tree using devDependencies recursively", async () => {
        const processor = new NpmGraphProcessor();
        const session = new AnalysisSession({
            meta: {
                target: "root",
                requested: "1.0.0",
                resolvedVersion: null,
                configHash: "test",
                timestamp: Date.now(),
                dependencyType: "devDependencies",
            },
            processors: [processor],
        });

        await processor.run(ctx, session);

        const graph = session.graph;
        expect(graph.hasNode("root@1.0.0")).toBe(true);
        expect(graph.hasNode("devDep1@1.0.0")).toBe(true);
        expect(graph.hasNode("devDep2@1.0.0")).toBe(true);

        // Standard dependencies should not be resolved
        expect(graph.hasNode("dep1@1.0.0")).toBe(false);
    });
});
