import process from "node:process";

import { Command } from "commander";

import { consoleLogger } from "@repo/shared/context/console-logger";
import type { ExecutionContext } from "@repo/shared/context/execution-context";
import { AnalysisEngine } from "@repo/shared/engine/analysis-engine";
import type { PackageNode } from "@repo/shared/graph/package-node";
import { defineRule } from "@repo/shared/lint/define-rule";
import { LintReporter } from "@repo/shared/lint/lint-reporter";
import type { LintRuleConfig } from "@repo/shared/lint/lint-rule-config";
import { LintSessionFactory } from "@repo/shared/lint/lint-session-factory";
import { NpmGraphProcessor } from "@repo/shared/processors/npm-graph-processor";
import { TestAnnotateProcessor } from "@repo/shared/processors/test-annotate";
import { TreeReporter } from "@repo/shared/reporters/tree-reporter";
import { AnalysisSession } from "@repo/shared/session/analysis-session";
import { FetchHttpTransport } from "@repo/shared/transport/fetch-http-transport";

import { InteractiveLogger } from "./interactive-logger.js";
import { noPostinstallRule } from "./lint-rule-scripts.js";

function shutdown() {
    process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Ensure stdin is flowing so SIGINT (Ctrl+C) is delivered reliably
// when running in a TTY (especially with interactive spinners like ora).
if (process.stdin.isTTY) {
    process.stdin.resume();
}

const program = new Command();

program
    .name("lint")
    .description("Lint an npm package")
    .argument("<package>", "The name of the package to lint")
    .argument("[version]", "The version of the package to lint", "latest")
    .action(async (packageName: string, version: string) => {
        const ctx: ExecutionContext = {
            http: new FetchHttpTransport(),
            logger: new InteractiveLogger(),
        };

        const noDevDepsRule = defineRule<{}>({
            id: "no-dev-deps",

            check(node: PackageNode) {
                return "Dev dependencies are not allowed.";
            },
        });

        const maxDepsRule = defineRule<{ max: number }, { count: number }>({
            id: "max-deps",

            check(node: PackageNode, ctx) {
                return "Max dependencies exceeded.";
            },

            annotate(node: PackageNode, params) {
                return { count: 3 };
            },
        });

        const ruleConfigs: LintRuleConfig<any>[] = [
            {
                rule: noDevDepsRule,
                severity: "warn",
                params: {},
            },
            {
                rule: maxDepsRule,
                severity: "error",
                params: { max: 20 },
            },
            {
                rule: noPostinstallRule,
                severity: "error",
                params: { maxLength: 0 },
            },
        ];

        const factory = new LintSessionFactory();

        const sessions = factory.createSessions(
            { target: packageName, requested: version },
            ruleConfigs,
        );

        const engine = new AnalysisEngine([new LintReporter()]);

        const isSuccess = await engine.run(ctx, sessions);

        process.exit(isSuccess ? 0 : 1);
    });

await program.parseAsync();
