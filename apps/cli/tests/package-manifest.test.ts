import { describe, it, expect } from "vitest";
import { z } from "zod";

import { PackageManifest } from "@repo/shared/graph/package-manifest";

describe("PackageManifest", () => {
    const manifestData = {
        name: "test-package",
        version: "1.0.0",
        scripts: {
            build: "tsc",
            test: "vitest",
        },
        nested: {
            deep: {
                value: 42,
            },
        },
    };

    describe("get()", () => {
        it.each([
            ["top-level value", "name", "test-package"],
            ["nested value", "scripts.build", "tsc"],
            ["deeply nested value", "nested.deep.value", 42],
        ])("returns %s", (_, path, expected) => {
            const manifest = new PackageManifest(manifestData);

            expect(manifest.get(path)).toBe(expected);
        });

        it("returns default value if path does not exist", () => {
            const manifest = new PackageManifest(manifestData);

            expect(manifest.get("scripts.lint", "eslint")).toBe("eslint");
        });

        it("returns default value if intermediate path is not an object", () => {
            const manifest = new PackageManifest(manifestData);

            expect(manifest.get("name.something", "fallback")).toBe("fallback");
        });

        it("returns undefined if value does not exist and no default is provided", () => {
            const manifest = new PackageManifest(manifestData);

            expect(manifest.get("does.not.exist")).toBeUndefined();
        });

        it("returns default when raw is not an object", () => {
            const manifest = new PackageManifest(null);

            expect(manifest.get("anything", "default")).toBe("default");
        });
    });

    describe("parse()", () => {
        it("parses successfully with valid schema", () => {
            const manifest = new PackageManifest(manifestData);

            const schema = z.object({
                name: z.string(),
                version: z.string(),
            });

            const result = manifest.parse(schema);

            expect(result.name).toBe("test-package");
            expect(result.version).toBe("1.0.0");
        });

        it("throws when schema doesn't match", () => {
            const manifest = new PackageManifest(manifestData);

            const schema = z.object({
                name: z.number(),
            });

            expect(() => manifest.parse(schema)).toThrow();
        });
    });

    describe("safeParse()", () => {
        it("parses successfully with valid schema", () => {
            const manifest = new PackageManifest(manifestData);

            const schema = z.object({
                name: z.string(),
            });

            const result = manifest.safeParse(schema);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.name).toBe("test-package");
            }
        });

        it("returns failure result for invalid schema", () => {
            const manifest = new PackageManifest(manifestData);

            const schema = z.object({
                name: z.number(),
            });

            const result = manifest.safeParse(schema);

            expect(result.success).toBe(false);
        });
    });

    describe("rawData", () => {
        it("returns the original raw data", () => {
            const manifest = new PackageManifest(manifestData);

            expect(manifest.rawData).toBe(manifestData);
        });
    });
});
