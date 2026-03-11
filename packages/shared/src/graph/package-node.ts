import { type PackageId } from "./package-id.js";
import type { PackageManifest } from "./package-manifest.js";

export type PackageNode = {
    id: PackageId;
    name: string;
    version: string;
    manifest: PackageManifest;
    source: "registry" | "external";
    alias?: {
        name: string;
        range: string;
    };
};

export function formatPackageNode(
    node: Pick<PackageNode, "name" | "version" | "source" | "alias">,
): string {
    if (node.source === "external") {
        return `${node.name}@${node.version} [external]`;
    }

    if (node.alias) {
        return `${node.name}@${node.version} (alias of ${node.alias.name}@${node.alias.range})`;
    }

    return `${node.name}@${node.version}`;
}
