import { DefaultDependencyTree, type DependencyTree } from "./dependency-tree.js";
import type { PackageId } from "./package-id.js";
import type { PackageNode } from "./package-node.js";

export type TraversalEdge =
    | { type: "edge"; from: PackageId; to: PackageId }
    | { type: "cycle"; from: PackageId; to: PackageId; path: PackageId[] };

export class DependencyGraph {
    private readonly nodes = new Map<PackageId, PackageNode>();
    private readonly edges = new Map<PackageId, Set<PackageId>>();
    private readonly rootId: PackageId;

    constructor(root: PackageNode) {
        this.rootId = root.id;
        this.addNode(root);
    }

    getRootId(): PackageId {
        return this.rootId;
    }

    getRoot(): PackageNode {
        return this.getNode(this.rootId);
    }

    addNode(node: PackageNode): void {
        this.nodes.set(node.id, node);
        this.edges.set(node.id, new Set());
    }

    addEdge(from: PackageId, to: PackageId): void {
        this.edges.get(from)?.add(to);
    }

    hasNode(id: PackageId): boolean {
        return this.nodes.has(id);
    }

    getNode(id: PackageId): PackageNode {
        const node = this.nodes.get(id);
        if (!node) {
            throw new Error(`Node not found: ${id}`);
        }
        return node;
    }

    getDependencies(id: PackageId): readonly PackageId[] {
        return Array.from(this.edges.get(id) ?? []);
    }

    getNodes(): Iterable<PackageNode> {
        return this.nodes.values();
    }

    traverseEdgesFrom(start: PackageId, visit: (edge: TraversalEdge) => void): void {
        const visited = new Set<PackageId>();
        const stack: PackageId[] = [];
        const inStack = new Set<PackageId>();

        const dfs = (current: PackageId): void => {
            visited.add(current);
            stack.push(current);
            inStack.add(current);

            for (const next of this.getDependencies(current)) {
                if (inStack.has(next)) {
                    visit({
                        type: "cycle",
                        from: current,
                        to: next,
                        path: [...stack, next],
                    });
                    continue;
                }

                visit({
                    type: "edge",
                    from: current,
                    to: next,
                });

                if (!visited.has(next)) {
                    dfs(next);
                }
            }

            stack.pop();
            inStack.delete(current);
        };

        dfs(start);
    }

    asTree(): DependencyTree {
        return new DefaultDependencyTree(this);
    }
}
