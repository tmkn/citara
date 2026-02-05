import z from "zod";

import type { NpmRegistryClient } from "../common/npm-registry-client.js";
import type { ExecutionContext } from "../context/execution-context.js";
import { DependencyGraph } from "../graph/dependency-graph.js";
import type { PackageId } from "../graph/package-id.js";
import { PackageManifest } from "../graph/package-manifest.js";
import type { PackageNode } from "../graph/package-node.js";
import type { AnalysisSession } from "../session/analysis-session.js";
import { type Processor } from "./processor.js";

export type NpmManifest = {
    name: string;
    version: string;
    dependencies?: Record<string, string>;
};

export type NpmPackageMetadata = {
    name: string;
    versions: Record<string, NpmManifest>;
    "dist-tags"?: Record<string, string>;
};

export class NpmGraphProcessor implements Processor {
    readonly name = "npm-graph";
    readonly dependsOn = [];

    constructor(private readonly _registryClient: NpmRegistryClient) {}

    async run(ctx: ExecutionContext, session: AnalysisSession): Promise<void> {
        const { target, requested, depth, dependencyType } = session.meta;
        const maxDepth = depth ?? Infinity;
        const depType = dependencyType ?? "dependencies";

        const rootManifest = await this._registryClient.fetchManifest(target, requested, ctx);

        session.meta.resolvedVersion = rootManifest.version;

        const rootNode: PackageNode = {
            id: this.pkgId(rootManifest),
            name: rootManifest.name,
            version: rootManifest.version,
            manifest: new PackageManifest(rootManifest),
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
                        manifest: new PackageManifest({
                            name,
                            version: range,
                            dependencies: {},
                        }),
                        source: "external",
                    };

                    graph.addNode(externalNode);
                }

                graph.addEdge(node.id, id);
                continue;
            }

            // Normal registry resolution
            const manifest = await this._registryClient.fetchManifest(name, range, ctx);
            const id = this.pkgId(manifest);

            if (!graph.hasNode(id)) {
                const child: PackageNode = {
                    id,
                    name: manifest.name,
                    version: manifest.version,
                    manifest: new PackageManifest(manifest),
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

    private _depsSchema = z.record(z.string(), z.string());
    private getDependencies(
        manifest: PackageManifest,
        dependencyType: string,
    ): Record<string, string> {
        const rawDeps = manifest.get(dependencyType);

        const result = this._depsSchema.safeParse(rawDeps);

        if (result.success) {
            return result.data;
        }

        return {};
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
