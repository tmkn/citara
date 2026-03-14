import type { PackageNode } from "../graph/package-node.js";
import type { LintResult } from "./lint-result.js";

export type LintContext<TParams = void, TData = void> = (TParams extends void
    ? { params: undefined }
    : { params: TParams }) &
    (TData extends void ? { data: undefined } : { data: TData });

export interface LintRule<TParams = void, TData = void> {
    readonly id: string;

    annotate?(
        node: PackageNode,
        ...args: TParams extends void ? [] : [TParams]
    ): Promise<TData> | TData;

    check(node: PackageNode, ctx: LintContext<TParams, TData>): LintResult | void;
}
