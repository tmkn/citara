import { describe, test, expect, vi, beforeEach } from "vitest";

import type { ExecutionContext } from "../src/context/execution-context.js";
import { AnalysisEngine } from "../src/engine/analysis-engine.js";
import type { Processor } from "../src/processors/processor.js";
import type { Reporter } from "../src/reporters/reporter.js";
import { AnalysisSession } from "../src/session/analysis-session.js";

function createMockProcessor(
    name: string,
    dependsOn: string[] = [],
    shouldThrow = false,
): Processor {
    return {
        name,
        dependsOn,
        run: vi.fn(async () => {
            if (shouldThrow) {
                throw new Error(`Simulated crash in ${name}`);
            }
        }),
    };
}

function createSession(processors: Processor[], target = "test"): AnalysisSession {
    return new AnalysisSession({
        meta: {
            target,
            requested: "latest",
            resolvedVersion: null,
            configHash: "",
            timestamp: 0,
        },
        processors,
    });
}

describe("AnalysisEngine", () => {
    let mockLogger: any;
    let mockCtx: ExecutionContext;
    let mockReporter: Reporter;
    let engine: AnalysisEngine;

    beforeEach(() => {
        mockLogger = {
            start: vi.fn(),
            stop: vi.fn(),
            info: vi.fn(),
            error: vi.fn(),
        };

        mockCtx = { logger: mockLogger } as unknown as ExecutionContext;
        mockReporter = { report: vi.fn() };

        engine = new AnalysisEngine([mockReporter]);
    });

    test("runs all phases in order, calls reporters, and returns true on full success", async () => {
        const graph = createMockProcessor("graph-proc", []);
        const annotate = createMockProcessor("annotate-proc", ["graph-proc"]);
        const diagnostics = createMockProcessor("diag-proc", ["annotate-proc"]);

        const session = createSession([graph, annotate, diagnostics]);

        const isSuccess = await engine.run(mockCtx, [session]);

        // POSIX Success
        expect(isSuccess).toBe(true);

        // lifecycle
        expect(mockLogger.start).toHaveBeenCalled();
        expect(mockLogger.stop).toHaveBeenCalled();

        // processors
        [graph, annotate, diagnostics].forEach((p) => expect(p.run).toHaveBeenCalledTimes(1));

        // reporters
        expect(mockReporter.report).toHaveBeenCalledWith([session]);
    });

    test("aborts subsequent processors if a dependency throws, skips reporters, and returns false", async () => {
        const graph = createMockProcessor("graph-proc", [], true);
        const annotate = createMockProcessor("annotate-proc", ["graph-proc"]);

        const session = createSession([graph, annotate], "lodash");

        const isSuccess = await engine.run(mockCtx, [session]);

        // POSIX Failure
        expect(isSuccess).toBe(false);

        // processor execution
        expect(graph.run).toHaveBeenCalledTimes(1);
        expect(annotate.run).toHaveBeenCalledTimes(0);

        // error recorded
        expect(session.errors).toMatchObject([{ fatal: true }]);

        // logging
        expect(mockLogger.error).toHaveBeenCalledWith(
            expect.stringContaining("Fatal Error in 'graph-proc' processor"),
        );

        // reporters skipped
        expect(mockReporter.report).not.toHaveBeenCalled();
    });

    test("isolates crashes between sessions but still fails the overall run", async () => {
        const badProc = createMockProcessor("bad-proc", [], true);
        const goodProc = createMockProcessor("good-proc", []);

        const session1 = createSession([badProc], "fail-pkg");
        const session2 = createSession([goodProc], "pass-pkg");

        const isSuccess = await engine.run(mockCtx, [session1, session2]);

        // POSIX Failure (because at least one failed)
        expect(isSuccess).toBe(false);

        // session 1 failed
        expect(badProc.run).toHaveBeenCalledTimes(1);
        expect(session1.errors).toHaveLength(1);

        // session 2 still executed
        expect(goodProc.run).toHaveBeenCalledTimes(1);
        expect(session2.errors).toHaveLength(0);

        // reporters skipped due to all-or-nothing rule
        expect(mockReporter.report).not.toHaveBeenCalled();

        expect(mockLogger.error).toHaveBeenCalledWith(
            expect.stringContaining(
                "One or more packages encountered a fatal error. Skipping reporters.",
            ),
        );
    });

    test("returns false if linting errors are present, but still runs the reporters", async () => {
        const goodProc = createMockProcessor("good-proc", []);
        const session = createSession([goodProc]);

        session.addDiagnostic({
            ruleId: "no-postinstall",
            nodeId: "pkg-a",
            severity: "error",
            message: "Failed rule",
        });

        const isSuccess = await engine.run(mockCtx, [session]);

        // POSIX Failure due to rule violation
        expect(isSuccess).toBe(false);

        // Reporters MUST still run so the user can see what the lint errors were
        expect(mockReporter.report).toHaveBeenCalledWith([session]);
    });

    test("detects circular dependencies and cleanly aborts the session without crashing the engine", async () => {
        // A depends on B, B depends on A
        const procA = createMockProcessor("proc-a", ["proc-b"]);
        const procB = createMockProcessor("proc-b", ["proc-a"]);

        const session = createSession([procA, procB]);

        const isSuccess = await engine.run(mockCtx, [session]);

        // POSIX Failure
        expect(isSuccess).toBe(false);

        // Neither processor should have run
        expect(procA.run).not.toHaveBeenCalled();
        expect(procB.run).not.toHaveBeenCalled();

        // The engine should have logged the topological sort error
        expect(mockLogger.error).toHaveBeenCalledWith(
            expect.stringContaining("Circular dependency detected"),
        );

        // The error should be attached to the session
        expect(session.errors).toHaveLength(1);
    });

    test("resolves diamond dependencies correctly (sibling processors)", async () => {
        const graph = createMockProcessor("graph", []);

        // Siblings (both depend ONLY on graph)
        const tarAnnotate = createMockProcessor("tar-annotate", ["graph"]);
        const lintAnnotate = createMockProcessor("lint-annotate", ["graph"]);

        // Final consumer (depends on both siblings)
        const diagnostics = createMockProcessor("diagnostics", ["tar-annotate", "lint-annotate"]);

        // Scramble the input order to prove the sort actually works!
        const session = createSession([diagnostics, lintAnnotate, graph, tarAnnotate]);

        const isSuccess = await engine.run(mockCtx, [session]);

        expect(isSuccess).toBe(true);

        // Prove every processor ran exactly once
        expect(graph.run).toHaveBeenCalledTimes(1);
        expect(tarAnnotate.run).toHaveBeenCalledTimes(1);
        expect(lintAnnotate.run).toHaveBeenCalledTimes(1);
        expect(diagnostics.run).toHaveBeenCalledTimes(1);
    });

    test("handles missing dependencies gracefully (fails the session)", async () => {
        // Depends on something that isn't registered in the session
        const isolatedProc = createMockProcessor("my-proc", ["does-not-exist"]);

        const session = createSession([isolatedProc]);

        const isSuccess = await engine.run(mockCtx, [session]);

        expect(isSuccess).toBe(false);
        expect(isolatedProc.run).not.toHaveBeenCalled();

        expect(mockLogger.error).toHaveBeenCalledWith(
            expect.stringContaining(
                "Missing dependency: Processor 'my-proc' depends on 'does-not-exist'",
            ),
        );
    });
});
