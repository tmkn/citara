import type { DependencyGraph } from "./dependency-graph.js";
import type { PackageId } from "./package-id.js";
import type { PackageNode } from "./package-node.js";
import type { TreeTraversalContext } from "./tree-traversal-context.js";

interface WalkState {
    node: PackageNode;
    depth: number;
    parent: PackageNode | null;
    path: PackageNode[];
    index: number;
    siblingCount: number;
}

export interface DependencyTree {
    walk(visitor: (node: PackageNode, ctx: TreeTraversalContext) => void): void;
}

export class DefaultDependencyTree implements DependencyTree {
    constructor(private readonly graph: DependencyGraph) {}

    walk(visitor: (node: PackageNode, ctx: TreeTraversalContext) => void): void {
        const root = this.graph.getRoot();

        const walkNode = (state: WalkState): void => {
            const { node, depth, parent, path, index, siblingCount } = state;

            const isCycle = path.some((p) => p.id === node.id);

            visitor(node, {
                depth,
                parent,
                path,
                isCycle,
                index,
                siblingCount,
            });

            if (isCycle) {
                return;
            }

            const nextPath = [...path, node];
            const deps = this.graph.getDependencies(node.id);

            deps.forEach((depId, i) => {
                const dep = this.graph.getNode(depId);

                walkNode({
                    node: dep,
                    depth: depth + 1,
                    parent: node,
                    path: nextPath,
                    index: i,
                    siblingCount: deps.length,
                });
            });
        };

        walkNode({
            node: root,
            depth: 0,
            parent: null,
            path: [],
            index: 0,
            siblingCount: 1,
        });
    }
}
