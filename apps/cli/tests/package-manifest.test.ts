import { describe, test, expect } from "vitest";
import { z } from "zod";

import { PackageManifest } from "@repo/shared/graph/package-manifest";

describe("PackageManifest", () => {
    const manifestData = {
        name: "test-package",
        version: "1.0.0",
        scripts: {
            build: "task for build",
        },
        nested: {
            deep: {
                value: 42,
            },
        },
    };

    describe("get()", () => {
        test.each([
            ["top-level value", "name", "test-package"],
            ["nested value", "scripts.build", "task for build"],
            ["deeply nested value", "nested.deep.value", 42],
        ])("returns %s", (_, path, expected) => {
            const manifest = new PackageManifest(manifestData);

            expect(manifest.get(path)).toBe(expected);
        });

        test("throws if path does not exist", () => {
            const manifest = new PackageManifest(manifestData);

            expect(() => manifest.get("scripts.lint")).toThrow(
                "Path 'scripts.lint' does not exist in the manifest.",
            );
        });

        test("throws if intermediate path does not exist", () => {
            const manifest = new PackageManifest(manifestData);

            expect(() => manifest.get("name.something")).toThrow(
                "Path 'name.something' does not exist in the manifest.",
            );
        });
    });

    describe("get(path, schema)", () => {
        test("returns parsed value when schema is valid", () => {
            const manifest = new PackageManifest(manifestData);

            const result = manifest.get("nested.deep.value", z.number());

            expect(result).toBe(42);
        });

        test("throws when schema validation fails", () => {
            const manifest = new PackageManifest(manifestData);

            expect(() => manifest.get("name", z.number())).toThrow("Invalid value at path 'name'");
        });
    });

    describe("getSafe()", () => {
        test.each([
            ["top-level value", "name", "test-package"],
            ["nested value", "scripts.build", "task for build"],
            ["deeply nested value", "nested.deep.value", 42],
        ])("returns %s", (_, path, expected) => {
            const manifest = new PackageManifest(manifestData);

            expect(manifest.getSafe(path)).toBe(expected);
        });

        test("returns undefined if path does not exist", () => {
            const manifest = new PackageManifest(manifestData);

            expect(manifest.getSafe("scripts.lint")).toBeUndefined();
        });

        test("returns undefined if intermediate path does not exist", () => {
            const manifest = new PackageManifest(manifestData);

            expect(manifest.getSafe("name.something")).toBeUndefined();
        });

        test("returns undefined when raw data is not an object", () => {
            const manifest = new PackageManifest(null);

            expect(manifest.getSafe("anything")).toBeUndefined();
        });
    });

    describe("rawData", () => {
        test("returns the original raw data", () => {
            const manifest = new PackageManifest(manifestData);

            expect(manifest.rawData).toBe(manifestData);
        });
    });

    describe("has()", () => {
        test("returns true for existing path", () => {
            const manifest = new PackageManifest(manifestData);

            expect(manifest.has("scripts.build")).toBe(true);
        });

        test("returns false for missing path", () => {
            const manifest = new PackageManifest(manifestData);

            expect(manifest.has("scripts.lint")).toBe(false);
        });

        test("returns false if intermediate path does not exist", () => {
            const manifest = new PackageManifest(manifestData);

            expect(manifest.has("name.something")).toBe(false);
        });
    });

    test("returns undefined if value exists but is undefined", () => {
        const manifest = new PackageManifest({
            scripts: { build: undefined },
        });

        expect(manifest.has("scripts.build")).toBe(true);
        expect(manifest.getSafe("scripts.build")).toBeUndefined();
        expect(manifest.get("scripts.build")).toBeUndefined();
    });
});
