import { describe, it, expect } from "vitest";

import { NpmPackageMetadataSchema, NpmManifestSchema } from "../src/common/npm-schema.js";

describe("schemas don't strip data", () => {
    it("NpmPackageMetadataSchema doesn't strip data", () => {
        const input = {
            name: "cantina",
            versions: {
                "18.2.0": {
                    name: "cantina",
                    version: "18.2.0",
                    dependencies: {},
                    extraField: 42, // extra inside manifest
                },
            },
            "dist-tags": { latest: "18.2.0" },
            extraTopLevel: true, // extra at top level
        };

        const parsed: any = NpmPackageMetadataSchema.parse(input);

        expect(parsed.extraTopLevel).toBe(true);
        expect(parsed.versions["18.2.0"].extraField).toBe(42);
    });

    it("NpmManifestSchema doesn't strip data", () => {
        const input = {
            name: "cantina",
            version: "18.2.0",
            dependencies: {},
            devDependencies: {},
            extraField: "I am extra", // extra field
        };

        const parsed: any = NpmManifestSchema.parse(input);

        expect(parsed.extraField).toBe("I am extra");
    });
});
