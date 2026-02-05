import { type PackageId } from "./package-id.js";
import type { PackageManifest } from "./package-manifest.js";

export type PackageNode = {
    id: PackageId;
    name: string;
    version: string;
    manifest: PackageManifest;
    source: "registry" | "external";
};
