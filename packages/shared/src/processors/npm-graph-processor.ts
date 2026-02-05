import * as semver from "semver";
import { QueryClient } from "@tanstack/query-core";

import type { ExecutionContext } from "../context/execution-context.js";
import { DependencyGraph } from "../graph/dependency-graph.js";
import type { PackageId } from "../graph/package-id.js";
import type { PackageNode } from "../graph/package-node.js";
import type { AnalysisSession } from "../session/analysis-session.js";
import { type Processor } from "./processor.js";

type NpmManifest = {
    name: string;
    version: string;
    dependencies?: Record<string, string>;
};

type NpmPackageMetadata = {
    name: string;
    versions: Record<string, NpmManifest>;
    "dist-tags"?: Record<string, string>;
};

export class NpmGraphProcessor implements Processor {
    readonly name = "npm-graph";
    readonly phase = "graph";

    private readonly _queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: 3,
                retryDelay: 0,
                staleTime: Infinity,
            },
        },
    });

    async run(ctx: ExecutionContext, session: AnalysisSession): Promise<void> {
        const { target, requested, depth, dependencyType } = session.meta;
        const maxDepth = depth ?? Infinity;
        const depType = dependencyType ?? "dependencies";

        const rootManifest = await this.fetchManifest(target, requested, ctx);

        session.meta.resolvedVersion = rootManifest.version;

        const rootNode: PackageNode = {
            id: this.pkgId(rootManifest),
            name: rootManifest.name,
            version: rootManifest.version,
            manifest: rootManifest,
            source: "registry",
        };

        const graph = new DependencyGraph(rootNode);
        session.setGraph(graph);

        await this.resolveDependencies(ctx, graph, rootNode, 0, maxDepth, depType);
    }

    private async resolveDependencies(
        ctx: ExecutionContext,
        graph: DependencyGraph,
        node: PackageNode,
        currentDepth: number,
        maxDepth: number,
        dependencyType: string,
    ): Promise<void> {
        if (currentDepth >= maxDepth) {
            return;
        }

        ctx.logger.info(`Resolving dependencies for ${node.name}@${node.version}`);

        const deps = this.getDependencies(node.manifest, dependencyType);

        for (const [name, range] of Object.entries(deps)) {
            // Handle non-registry dependencies (git, file, url, workspace, etc.)
            if (!this.isRegistryRange(range)) {
                const id: PackageId = `${name}@${range}`;

                if (!graph.hasNode(id)) {
                    const externalNode: PackageNode = {
                        id,
                        name,
                        version: range, // opaque version
                        manifest: {
                            name,
                            version: range,
                            dependencies: {},
                        },
                        source: "external",
                    };

                    graph.addNode(externalNode);
                }

                graph.addEdge(node.id, id);
                continue;
            }

            // Normal registry resolution
            const manifest = await this.fetchManifest(name, range, ctx);
            const id = this.pkgId(manifest);

            if (!graph.hasNode(id)) {
                const child: PackageNode = {
                    id,
                    name: manifest.name,
                    version: manifest.version,
                    manifest,
                    source: "registry",
                };

                graph.addNode(child);
                graph.addEdge(node.id, id);

                await this.resolveDependencies(
                    ctx,
                    graph,
                    child,
                    currentDepth + 1,
                    maxDepth,
                    dependencyType,
                );
            } else {
                graph.addEdge(node.id, id);
            }
        }
    }

    private getDependencies(manifest: unknown, dependencyType: string): Record<string, string> {
        if (typeof manifest !== "object" || manifest === null || manifest === undefined) {
            return {};
        }

        const obj = manifest as Record<string, any>;
        return obj[dependencyType] ?? {};
    }

    private async fetchManifest(
        name: string,
        range: string,
        ctx: ExecutionContext,
    ): Promise<NpmManifest> {
        return this._queryClient.fetchQuery({
            queryKey: ["npm-manifest", name],
            queryFn: async () => {
                const res = await ctx.http.request({
                    url: `https://registry.npmjs.org/${name}`,
                    method: "GET",
                });

                if (res.status !== 200) {
                    throw new Error(`Failed to fetch package metadata for ${name}: ${res.status}`);
                }

                const metadata = JSON.parse(res.body as string) as NpmPackageMetadata;

                const resolvedVersion = this.resolveVersion(metadata, range);

                const manifest = metadata.versions[resolvedVersion];

                if (!manifest) {
                    throw new Error(`Resolved version ${resolvedVersion} not found for ${name}`);
                }

                return manifest;
            },
        });
    }

    private resolveVersion(metadata: NpmPackageMetadata, range: string): string {
        // dist-tag (latest, next, beta, etc.)
        const tag = metadata["dist-tags"]?.[range];
        if (tag) return tag;

        const versions = Object.keys(metadata.versions);
        const resolved = semver.maxSatisfying(versions, range);

        if (!resolved) {
            throw new Error(`Could not resolve version for ${metadata.name}@${range}`);
        }

        return resolved;
    }

    private isRegistryRange(range: string): boolean {
        // git
        if (range.startsWith("git://")) return false;
        if (range.startsWith("git+")) return false;
        if (range.startsWith("github:")) return false;
        if (range.startsWith("gitlab:")) return false;
        if (range.startsWith("bitbucket:")) return false;

        // file / link / workspace
        if (range.startsWith("file:")) return false;
        if (range.startsWith("link:")) return false;
        if (range.startsWith("workspace:")) return false;

        // direct tarballs
        if (range.startsWith("http://")) return false;
        if (range.startsWith("https://")) return false;

        return true;
    }

    private pkgId(manifest: NpmManifest): PackageId {
        return `${manifest.name}@${manifest.version}`;
    }
}
