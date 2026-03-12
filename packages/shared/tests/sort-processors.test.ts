import { describe, test, expect, vi } from "vitest";

import { sortProcessors } from "../src/engine/sort-processors.js";
import type { Processor } from "../src/processors/processor.js";

function createMockProcessor(name: string, dependsOn: string[] = []): Processor {
    return {
        name,
        dependsOn,
        run: vi.fn(), // We don't care about the run method here, just the metadata
    };
}

describe("sortProcessors", () => {
    test("sorts a simple linear dependency chain", () => {
        const step1 = createMockProcessor("step-1", []);
        const step2 = createMockProcessor("step-2", ["step-1"]);
        const step3 = createMockProcessor("step-3", ["step-2"]);

        // Scramble the input
        const input = [step3, step1, step2];
        const sorted = sortProcessors(input);

        expect(sorted.map((p) => p.name)).toEqual(["step-1", "step-2", "step-3"]);
    });

    test("sorts a diamond dependency graph correctly", () => {
        const root = createMockProcessor("root", []);
        const left = createMockProcessor("left", ["root"]);
        const right = createMockProcessor("right", ["root"]);
        const leaf = createMockProcessor("leaf", ["left", "right"]);

        // Scramble the input
        const input = [leaf, right, root, left];
        const sorted = sortProcessors(input);
        const sortedNames = sorted.map((p) => p.name);

        // Root must be first, Leaf must be last
        expect(sortedNames[0]).toBe("root");
        expect(sortedNames[3]).toBe("leaf");

        // Left and Right must be in the middle, but their exact order doesn't matter
        expect(sortedNames.slice(1, 3)).toEqual(expect.arrayContaining(["left", "right"]));
    });

    test("handles processors with no dependencies (preserves relative order)", () => {
        const a = createMockProcessor("A", []);
        const b = createMockProcessor("B", []);
        const c = createMockProcessor("C", []);

        const input = [b, c, a];
        const sorted = sortProcessors(input);

        // They have no constraints, but Kahn's algorithm will usually preserve
        // the order they were discovered in the input array.
        expect(sorted.map((p) => p.name)).toEqual(["B", "C", "A"]);
    });

    test("throws a descriptive error if a dependency is completely missing", () => {
        const root = createMockProcessor("root", []);
        // Typo! 'rooot' instead of 'root'
        const typoDep = createMockProcessor("bad-node", ["rooot"]);

        expect(() => sortProcessors([root, typoDep])).toThrowError(
            "Missing dependency: Processor 'bad-node' depends on 'rooot', which is not registered in the session.",
        );
    });

    test("throws an error if a direct circular dependency is detected", () => {
        const ping = createMockProcessor("ping", ["pong"]);
        const pong = createMockProcessor("pong", ["ping"]);

        expect(() => sortProcessors([ping, pong])).toThrowError(
            "Circular dependency detected in processor configuration.",
        );
    });

    test("throws an error if an indirect (deep) circular dependency is detected", () => {
        const a = createMockProcessor("A", ["C"]); // A relies on C
        const b = createMockProcessor("B", ["A"]); // B relies on A
        const c = createMockProcessor("C", ["B"]); // C relies on B (Cycle!)

        expect(() => sortProcessors([a, b, c])).toThrowError(
            "Circular dependency detected in processor configuration.",
        );
    });

    test("throws if two processors have the same name", () => {
        const a = createMockProcessor("dup");
        const b = createMockProcessor("dup");

        expect(() => sortProcessors([a, b])).toThrowError(
            "Duplicate processor name detected: 'dup'. Processor names must be unique within a session.",
        );
    });
});
