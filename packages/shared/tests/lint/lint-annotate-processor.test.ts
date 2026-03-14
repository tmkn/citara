import { describe, test, expect } from "vitest";

import { CachedNpmRegistryClient } from "../../src/common/npm-registry-client.js";
import { LintAnnotateProcessor } from "../../src/lint/lint-annotate-processor.js";
import { lintRuleAnnotation } from "../../src/lint/lint-annotations.js";
import type { LintRule } from "../../src/lint/lint-rule.js";
import { NpmGraphProcessor } from "../../src/processors/npm-graph-processor.js";
import { createContext, createSession } from "../util.js";

describe("LintAnnotateProcessor", () => {
    async function setupSession() {
        const mockManifests: Record<string, any> = {
            medallo: {
                name: "medallo",
                "dist-tags": {
                    latest: "1.0.0",
                },
                versions: {
                    "1.0.0": {
                        name: "medallo",
                        version: "1.0.0",
                        dependencies: {},
                    },
                },
            },
        };
        const graphProcessor = new NpmGraphProcessor(new CachedNpmRegistryClient());
        const session = createSession(graphProcessor, "medallo");
        const ctx = createContext(mockManifests);

        await graphProcessor.run(ctx, session);

        return { ctx, session };
    }

    test("stores annotation when annotate is synchronous", async () => {
        const rule: LintRule<void, number> = {
            id: "sync-rule",
            annotate() {
                return 13;
            },
            check() {
                return "";
            },
        };

        const { ctx, session } = await setupSession();

        const processor = new LintAnnotateProcessor({
            severity: "warn",
            rule,
            params: undefined,
        });

        await processor.run(ctx, session);
        const key = lintRuleAnnotation(rule.id).key;
        const value = session.getAnnotation("medallo@1.0.0", key);

        expect(value).toBe(13);
    });

    test("stores annotation when annotate is async", async () => {
        const rule: LintRule<void, number> = {
            id: "async-rule",
            async annotate() {
                return 13;
            },
            check() {
                return "";
            },
        };

        const { ctx, session } = await setupSession();

        const processor = new LintAnnotateProcessor({
            severity: "warn",
            rule,
            params: undefined,
        });

        await processor.run(ctx, session);
        const key = lintRuleAnnotation(rule.id).key;
        const value = session.getAnnotation("medallo@1.0.0", key);

        expect(value).toBe(13);
    });

    test("does nothing when rule has no annotate function", async () => {
        const rule: LintRule = {
            id: "no-annotate-rule",
            check() {},
        };

        const { ctx, session } = await setupSession();

        const processor = new LintAnnotateProcessor({
            severity: "warn",
            rule,
            params: undefined,
        });

        await processor.run(ctx, session);

        const key = lintRuleAnnotation(rule.id).key;
        const value = session.getAnnotation("medallo@1.0.0", key);

        expect(value).toBeUndefined();
    });
});
