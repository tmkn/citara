import { describe, expect, test } from "vitest";

import { formatPackageNode } from "../src/graph/package-node.js";

type FormatPackageNode = Parameters<typeof formatPackageNode>[0];

describe("formatPackageNode", () => {
    test("formats standard registry package", () => {
        const node: FormatPackageNode = {
            name: "react",
            version: "18.2.0",
            source: "registry",
        };
        expect(formatPackageNode(node)).toBe("react@18.2.0");
    });

    test("formats external package with suffix", () => {
        const node: FormatPackageNode = {
            name: "my-local-pkg",
            version: "file:../my-local-pkg",
            source: "external",
        };

        expect(formatPackageNode(node)).toBe("my-local-pkg@file:../my-local-pkg [external]");
    });

    test("formats aliased package with underlying name and range", () => {
        const node: FormatPackageNode = {
            name: "wrap-ansi-cjs",
            version: "7.0.0",
            source: "registry",
            alias: {
                name: "wrap-ansi",
                range: "^7.0.0",
            },
        };

        expect(formatPackageNode(node)).toBe("wrap-ansi-cjs@7.0.0 (alias of wrap-ansi@^7.0.0)");
    });

    test("prioritizes external formatting over alias formatting", () => {
        const node: FormatPackageNode = {
            name: "weird-edge-case",
            version: "1.0.0",
            source: "external",
            alias: {
                name: "some-target",
                range: "latest",
            },
        };

        // The 'external' check happens first in the function
        expect(formatPackageNode(node)).toBe("weird-edge-case@1.0.0 [external]");
    });
});
