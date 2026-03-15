import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

import { CachedNpmRegistryClient } from "../../src/common/npm-registry-client.js";
import { LintReporter } from "../../src/lint/lint-reporter.js";
import { NpmGraphProcessor } from "../../src/processors/npm-graph-processor.js";
import type { Diagnostic } from "../../src/session/analysis-session.js";
import { createContext, createSession } from "./../util.js";

const makePkg = (name: string, dependencies: Record<string, string> = {}) => ({
    name,
    versions: {
        "1.0.0": { name, version: "1.0.0", dependencies },
    },
});

function makeDefaultManifests() {
    return {
        root: makePkg("root", { dep1: "^1.0.0", dep2: "^1.0.0" }),
        dep1: makePkg("dep1", { shared: "^1.0.0" }),
        dep2: makePkg("dep2", { shared: "^1.0.0" }),
        shared: makePkg("shared"),
    };
}

describe("LintReporter", () => {
    let logSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    function getOutput() {
        return logSpy.mock.calls.flat().join("\n");
    }

    async function executeReporterFlow(
        diagnostics: Diagnostic[],
        manifests: Record<string, any> = makeDefaultManifests(),
    ) {
        const processor = new NpmGraphProcessor(new CachedNpmRegistryClient());
        const session = createSession(processor, "root");
        const ctx = createContext(manifests);

        await processor.run(ctx, session);
        session.diagnostics.push(...diagnostics);

        const reporter = new LintReporter();
        await reporter.report([session]);

        return getOutput();
    }

    test("prints summary counts", async () => {
        const output = await executeReporterFlow([
            {
                nodeId: "dep1@1.0.0",
                severity: "error",
                ruleId: "test-rule",
                message: "broken dependency",
            },
        ]);

        expect(output).toContain("1 error");
    });

    // shared appears twice in the dependency graph
    test("prints duplicate omission message when node appears multiple times", async () => {
        const output = await executeReporterFlow([
            {
                nodeId: "shared@1.0.0",
                severity: "error",
                ruleId: "duplicate-test",
                message: "shared issue",
            },
        ]);

        expect(output).toContain("duplicate occurrences");
    });

    test("does not print duplicate message when none exist", async () => {
        const linearManifests = {
            root: makePkg("root", { dep1: "^1.0.0" }),
            dep1: makePkg("dep1"),
            shared: makePkg("shared"),
        };

        const output = await executeReporterFlow(
            [
                {
                    nodeId: "dep1@1.0.0",
                    severity: "warn",
                    ruleId: "test-warning",
                    message: "some message",
                },
            ],
            linearManifests,
        );

        expect(output).not.toContain("duplicate occurrences");
    });
});
