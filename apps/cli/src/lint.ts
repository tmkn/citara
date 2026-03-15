import process from "node:process";

import { Command } from "commander";

import { consoleLogger } from "@repo/shared/context/console-logger";
import type { ExecutionContext } from "@repo/shared/context/execution-context";
import { AnalysisEngine } from "@repo/shared/engine/analysis-engine";
import type { PackageNode } from "@repo/shared/graph/package-node";
import { defineLintRule } from "@repo/shared/lint/define-rule";
import { LintReporter } from "@repo/shared/lint/lint-reporter";
import { ruleConfig, type LintRuleConfig } from "@repo/shared/lint/lint-rule-config";
import { LintSessionFactory } from "@repo/shared/lint/lint-session-factory";
import { unsafeScripts } from "@repo/shared/lint/rules/unsafe-scripts";
import { NpmGraphProcessor } from "@repo/shared/processors/npm-graph-processor";
import { TestAnnotateProcessor } from "@repo/shared/processors/test-annotate";
import { TreeReporter } from "@repo/shared/reporters/tree-reporter";
import { AnalysisSession } from "@repo/shared/session/analysis-session";
import { FetchHttpTransport } from "@repo/shared/transport/fetch-http-transport";

import { InteractiveLogger } from "./interactive-logger.js";

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

        const noDevDepsRule = defineLintRule({
            id: "no-dev-deps",

            check(node: PackageNode, ctx) {
                const foo = ctx;
                return "Dev dependencies are not allowed.";
            },
        });

        const maxDepsRule = defineLintRule<{ max: number }, { count: number }>({
            id: "max-deps",

            check(node: PackageNode, ctx) {
                const foo = ctx.data;
                return "Max dependencies exceeded.";
            },

            annotate(node: PackageNode, params) {
                return { count: 3 };
            },
        });

        const ruleConfigs: LintRuleConfig[] = [
            // ruleConfig({
            //     rule: noDevDepsRule,
            //     severity: "warn",
            // }),
            // ruleConfig({
            //     rule: maxDepsRule,
            //     severity: "error",
            //     params: { max: 20 },
            // }),
            ruleConfig({
                rule: unsafeScripts,
                severity: "error",
                params: { scripts: ["preinstall", "postinstall"] },
            }),
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
