import type { PackageNode } from "./package-node.js";

export interface TreeTraversalContext {
    depth: number;
    parent: PackageNode | null;
    path: readonly PackageNode[];
    isCycle: boolean;

    // structural traversal metadata
    index: number;
    siblingCount: number;
}
