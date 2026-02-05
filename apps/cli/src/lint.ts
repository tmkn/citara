import type { ExecutionContext } from "@repo/shared/context/execution-context";
import { NpmGraphProcessor } from "@repo/shared/processors/npm-graph-processor";
import { TreeReporter } from "@repo/shared/reporters/tree-reporter";
import { AnalysisSession } from "@repo/shared/session/analysis-session";
import { FetchHttpTransport } from "@repo/shared/transport/fetch-http-transport";
import { AnalysisEngine } from "@repo/shared/engine/analysis-engine";
import { TestAnnotateProcessor } from "@repo/shared/processors/test-annotate";
import { InteractiveLogger } from "./interactive-logger.js";
import type { LintRuleConfig } from "@repo/shared/lint/lint-rule-config";
import { LintSessionFactory } from "@repo/shared/lint/lint-session-factory";
import { LintReporter } from "@repo/shared/lint/lint-reporter";

const ctx: ExecutionContext = {
    http: new FetchHttpTransport(),
    logger: new InteractiveLogger(),
};

const ruleConfigs: LintRuleConfig[] = [
    {
        rule: {
            id: "no-dev-deps",
            check(node) {
                return "Dev dependencies are not allowed.";
            },
        },
        severity: "warn",
        options: {},
    },
    {
        rule: {
            id: "max-deps",
            check(node) {
                return "Max dependencies exceeded.";
            },
        },
        severity: "error",
        options: { max: 20 },
    },
];

const factory = new LintSessionFactory();

const sessions = factory.createSessions({ target: "react", requested: "17.0.2" }, ruleConfigs);

const engine = new AnalysisEngine([new LintReporter(ruleConfigs)]);

await engine.run(ctx, sessions);
