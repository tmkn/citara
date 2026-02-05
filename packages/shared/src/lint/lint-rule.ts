import type { PackageNode } from "../graph/package-node.js";
import type { LintResult } from "./lint-result.js";

export interface LintRule<TOptions = unknown> {
    id: string;

    annotate?(node: PackageNode, options: TOptions): unknown;

    check(node: PackageNode, options: TOptions): LintResult;
}
