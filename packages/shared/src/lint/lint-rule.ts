import type { PackageNode } from "../graph/package-node.js";
import type { LintResult } from "./lint-result.js";

export interface LintContext<TParams = void, TData = void> {
    params: TParams;
    data?: TData;
}

export interface LintRule<TParams = void, TData = void> {
    readonly id: string;

    annotate?(node: PackageNode, params: TParams): TData;

    check(node: PackageNode, ctx: LintContext<TParams, TData>): LintResult;
}
