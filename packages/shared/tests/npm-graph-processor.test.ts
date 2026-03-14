import { describe, test, expect } from "vitest";

import { CachedNpmRegistryClient } from "../src/common/npm-registry-client.js";
import { NpmGraphProcessor } from "../src/processors/npm-graph-processor.js";
import { createContext, createSession } from "./util.js";

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

describe("NpmGraphProcessor", () => {
    test("resolves full tree by default", async () => {
        const processor = new NpmGraphProcessor(new CachedNpmRegistryClient());
        const session = createSession(processor, "root");

        const ctx = createContext(mockManifests);
        await processor.run(ctx, session);

        const graph = session.graph;
        expect(graph.hasNode("root@1.0.0")).toBe(true);
        expect(graph.hasNode("dep1@1.0.0")).toBe(true);
        expect(graph.hasNode("dep2@1.0.0")).toBe(true);
        expect(graph.hasNode("devDep1@1.0.0")).toBe(false);
    });

    test("resolves tree with depth 1", async () => {
        const processor = new NpmGraphProcessor(new CachedNpmRegistryClient());
        const session = createSession(processor, "root", { depth: 1 });

        const ctx = createContext(mockManifests);
        await processor.run(ctx, session);

        const graph = session.graph;
        expect(graph.hasNode("root@1.0.0")).toBe(true);
        expect(graph.hasNode("dep1@1.0.0")).toBe(true);
        expect(graph.hasNode("dep2@1.0.0")).toBe(false);
    });

    test("resolves tree with depth 0", async () => {
        const processor = new NpmGraphProcessor(new CachedNpmRegistryClient());
        const session = createSession(processor, "root", { depth: 0 });

        const ctx = createContext(mockManifests);
        await processor.run(ctx, session);

        const graph = session.graph;
        expect(graph.hasNode("root@1.0.0")).toBe(true);
        expect(graph.hasNode("dep1@1.0.0")).toBe(false);
    });

    test("resolves tree using devDependencies recursively", async () => {
        const processor = new NpmGraphProcessor(new CachedNpmRegistryClient());
        const session = createSession(processor, "root", { dependencyType: "devDependencies" });

        const ctx = createContext(mockManifests);
        await processor.run(ctx, session);

        const graph = session.graph;
        expect(graph.hasNode("root@1.0.0")).toBe(true);
        expect(graph.hasNode("devDep1@1.0.0")).toBe(true);
        expect(graph.hasNode("devDep2@1.0.0")).toBe(true);

        // Standard dependencies should not be resolved
        expect(graph.hasNode("dep1@1.0.0")).toBe(false);
    });
});

describe("NpmGraphProcessor (alias handling)", () => {
    const allAliasManifests: Record<string, any> = {
        aliasRoot: {
            name: "aliasRoot",
            versions: {
                "1.0.0": {
                    name: "aliasRoot",
                    version: "1.0.0",
                    dependencies: {
                        "wrap-ansi-cjs": "npm:wrap-ansi@^7.0.0",
                    },
                },
            },
        },
        "wrap-ansi": {
            name: "wrap-ansi",
            versions: {
                "7.0.0": {
                    name: "wrap-ansi",
                    version: "7.0.0",
                    dependencies: { dep2: "^1.0.0" },
                },
            },
        },
        dep2: {
            name: "dep2",
            versions: {
                "1.0.0": { name: "dep2", version: "1.0.0", dependencies: {} },
            },
        },
        multiAliasRoot: {
            name: "multiAliasRoot",
            versions: {
                "1.0.0": {
                    name: "multiAliasRoot",
                    version: "1.0.0",
                    dependencies: {
                        "wrap-ansi-old": "npm:wrap-ansi@^7.0.0",
                        "wrap-ansi-new": "npm:wrap-ansi@^7.0.0",
                    },
                },
            },
        },
        scopedRoot: {
            name: "scopedRoot",
            versions: {
                "1.0.0": {
                    name: "scopedRoot",
                    version: "1.0.0",
                    dependencies: {
                        scopedAlias: "npm:@scope/pkg@^1.0.0",
                    },
                },
            },
        },
        "@scope/pkg": {
            name: "@scope/pkg",
            versions: {
                "1.1.0": { name: "@scope/pkg", version: "1.1.0", dependencies: {} },
            },
        },
        versionlessRoot: {
            name: "versionlessRoot",
            versions: {
                "1.0.0": {
                    name: "versionlessRoot",
                    version: "1.0.0",
                    dependencies: {
                        "unscoped-alias": "npm:test-dep",
                        "scoped-alias": "npm:@scope/test-dep",
                    },
                },
            },
        },
        "test-dep": {
            name: "test-dep",
            "dist-tags": { latest: "4.17.21" },
            versions: {
                "4.17.21": { name: "test-dep", version: "4.17.21", dependencies: {} },
            },
        },
        "@scope/test-dep": {
            name: "@scope/test-dep",
            "dist-tags": { latest: "1.1.0" },
            versions: {
                "1.1.0": { name: "@scope/test-dep", version: "1.1.0", dependencies: {} },
            },
        },
    };

    test("resolves npm alias dependency", async () => {
        const processor = new NpmGraphProcessor(new CachedNpmRegistryClient());
        const session = createSession(processor, "aliasRoot");
        const ctx = createContext(allAliasManifests);

        await processor.run(ctx, session);
        const graph = session.graph;

        expect(graph.hasNode("aliasRoot@1.0.0")).toBe(true);
        expect(graph.hasNode("wrap-ansi-cjs@7.0.0")).toBe(true);

        const node = graph.getNode("wrap-ansi-cjs@7.0.0");
        expect(node.name).toBe("wrap-ansi-cjs");
        expect(node.version).toBe("7.0.0");
        expect(node.alias).toEqual({ name: "wrap-ansi", range: "^7.0.0" });
    });

    test("resolves dependencies of aliased packages", async () => {
        const processor = new NpmGraphProcessor(new CachedNpmRegistryClient());
        const session = createSession(processor, "aliasRoot");
        const ctx = createContext(allAliasManifests);

        await processor.run(ctx, session);
        const graph = session.graph;

        expect(graph.hasNode("wrap-ansi-cjs@7.0.0")).toBe(true);
        expect(graph.hasNode("dep2@1.0.0")).toBe(true);
    });

    test("alias respects depth limits", async () => {
        const processor = new NpmGraphProcessor(new CachedNpmRegistryClient());
        const session = createSession(processor, "aliasRoot", { depth: 1 });
        const ctx = createContext(allAliasManifests);

        await processor.run(ctx, session);
        const graph = session.graph;

        expect(graph.hasNode("wrap-ansi-cjs@7.0.0")).toBe(true);
        expect(graph.hasNode("dep2@1.0.0")).toBe(false);
    });

    test("supports multiple aliases pointing to the same package", async () => {
        const processor = new NpmGraphProcessor(new CachedNpmRegistryClient());
        const session = createSession(processor, "multiAliasRoot");
        const ctx = createContext(allAliasManifests);

        await processor.run(ctx, session);
        const graph = session.graph;

        expect(graph.hasNode("wrap-ansi-old@7.0.0")).toBe(true);
        expect(graph.hasNode("wrap-ansi-new@7.0.0")).toBe(true);
    });

    test("resolves scoped npm alias dependency", async () => {
        const processor = new NpmGraphProcessor(new CachedNpmRegistryClient());
        const session = createSession(processor, "scopedRoot");
        const ctx = createContext(allAliasManifests);

        await processor.run(ctx, session);
        const graph = session.graph;

        expect(graph.hasNode("scopedRoot@1.0.0")).toBe(true);
        expect(graph.hasNode("scopedAlias@1.1.0")).toBe(true);

        const node = graph.getNode("scopedAlias@1.1.0");
        expect(node.alias).toEqual({ name: "@scope/pkg", range: "^1.0.0" });
    });

    test("resolves versionless unscoped alias to latest", async () => {
        const processor = new NpmGraphProcessor(new CachedNpmRegistryClient());
        const session = createSession(processor, "versionlessRoot");
        const ctx = createContext(allAliasManifests);

        await processor.run(ctx, session);
        const graph = session.graph;

        expect(graph.hasNode("unscoped-alias@4.17.21")).toBe(true);
        const node = graph.getNode("unscoped-alias@4.17.21");
        expect(node.alias).toEqual({ name: "test-dep", range: "latest" });
    });

    test("resolves versionless scoped alias to latest", async () => {
        const processor = new NpmGraphProcessor(new CachedNpmRegistryClient());
        const session = createSession(processor, "versionlessRoot");
        const ctx = createContext(allAliasManifests);

        await processor.run(ctx, session);
        const graph = session.graph;

        expect(graph.hasNode("scoped-alias@1.1.0")).toBe(true);
        const node = graph.getNode("scoped-alias@1.1.0");
        expect(node.alias).toEqual({ name: "@scope/test-dep", range: "latest" });
    });
});
