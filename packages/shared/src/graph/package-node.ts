import { type PackageId } from "./package-id.js";

export type PackageNode = {
    id: PackageId;
    name: string;
    version: string;
    manifest: unknown;
    source: "registry" | "external";
};
