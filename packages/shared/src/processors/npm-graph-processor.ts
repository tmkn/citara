import type { NpmRegistryClient } from "../common/npm-registry-client.js";
import { DependenciesSchema, type Dependencies } from "../common/npm-schema.js";
import type { ExecutionContext } from "../context/execution-context.js";
import { DependencyGraph } from "../graph/dependency-graph.js";
import type { PackageId } from "../graph/package-id.js";
import { PackageManifest } from "../graph/package-manifest.js";
import type { PackageNode } from "../graph/package-node.js";
import type { AnalysisSession } from "../session/analysis-session.js";
import { type Processor } from "./processor.js";

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
            id: this.pkgId(rootManifest.name, rootManifest.version),
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

        let deps: Dependencies = {};
        try {
            deps = this.getDependencies(node.manifest, dependencyType);
        } catch {
            throw new Error(
                `Invalid dependencies in manifest of ${node.name}@${node.version} under '${dependencyType}'`,
            );
        }

        for (const [depName, rawRange] of Object.entries(deps)) {
            const alias = this.parseAlias(rawRange);

            const lookupName = alias ? alias.name : depName;
            const lookupRange = alias ? alias.range : rawRange;

            // Handle non-registry dependencies
            if (!this.isRegistryRange(lookupRange)) {
                const id: PackageId = `${depName}@${lookupRange}`;

                if (!graph.hasNode(id)) {
                    const externalNode: PackageNode = {
                        id,
                        name: depName,
                        version: lookupRange,
                        manifest: new PackageManifest({
                            name: depName,
                            version: lookupRange,
                            dependencies: {},
                        }),
                        source: "external",
                    };

                    graph.addNode(externalNode);
                }

                graph.addEdge(node.id, id);
                continue;
            }

            const manifest = await this._registryClient.fetchManifest(lookupName, lookupRange, ctx);

            const id = this.pkgId(depName, manifest.version);

            if (!graph.hasNode(id)) {
                const child: PackageNode = {
                    id,
                    name: depName,
                    version: manifest.version,
                    manifest: new PackageManifest(manifest),
                    source: "registry",

                    ...(alias && {
                        alias: {
                            name: alias.name,
                            range: alias.range,
                        },
                    }),
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

    private getDependencies(manifest: PackageManifest, dependencyType: string): Dependencies {
        const rawDeps = manifest.getSafe(dependencyType) ?? {};

        return DependenciesSchema.parse(rawDeps);
    }

    private parseAlias(range: string): { name: string; range: string } | null {
        if (!range.startsWith("npm:")) {
            return null;
        }

        const spec = range.slice(4);
        const idx = spec.lastIndexOf("@");

        // If there's no '@' (idx === -1) OR it's just the scope '@' (idx === 0)
        // Then the user didn't provide a version. Default to "latest".
        if (idx <= 0) {
            return {
                name: spec,
                range: "latest", // Fallback version for the registry lookup
            };
        }

        const name = spec.slice(0, idx);
        const versionRange = spec.slice(idx + 1);

        // Sanity check just in case it's literally "npm:@" or something broken
        if (!name || !versionRange) {
            return null;
        }

        return {
            name,
            range: versionRange,
        };
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

    private pkgId(name: string, version: string): PackageId {
        return `${name}@${version}`;
    }
}
