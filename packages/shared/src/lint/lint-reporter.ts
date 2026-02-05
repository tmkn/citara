import chalk from "chalk";
import type { Reporter } from "../reporters/reporter.js";
import type { AnalysisSession, Diagnostic } from "../session/analysis-session.js";
import { ALL_SEVERITIES } from "./lint-rule-config.js";

export class LintReporter implements Reporter {
    async report(sessions: readonly AnalysisSession[]): Promise<void> {
        let errorCount = 0;
        let warnCount = 0;

        for (const session of sessions) {
            if (!session.graph) continue;

            const findingsByNode = new Map<string, Diagnostic[]>();

            for (const node of session.graph.getNodes()) {
                findingsByNode.set(node.id, []);
            }

            for (const diagnostic of session.diagnostics) {
                findingsByNode.get(diagnostic.nodeId)?.push(diagnostic);

                if (diagnostic.severity === "error") errorCount++;
                else warnCount++;
            }

            session.graph.asTree().walk((node, ctx) => {
                const findings = findingsByNode.get(node.id) ?? [];

                if (findings.length === 0) return;

                const divider = " → ";
                const ancestors = ctx.path.map((n) => chalk.grey(n.name)).join(divider);
                const target = chalk.cyan(`${node.name}@${node.version}`);
                const fullPath = ancestors ? `${ancestors}${divider}${target}` : target;

                console.log(`${fullPath}`);

                for (const finding of findings) {
                    const severityColor = finding.severity === "error" ? chalk.red : chalk.yellow;
                    const label = severityColor(padSeverity(formatSeverity(finding.severity)));

                    if (finding.message) {
                        console.log(`  ${label} ${finding.ruleId} — ${finding.message}`);
                    } else {
                        console.log(`  ${label} ${finding.ruleId}`);
                    }
                }

                console.log("");
            });
        }

        const warningText = chalk.yellow(`${warnCount} warning(s)`);
        const errorText = chalk.red(`${errorCount} error(s)`);
        console.log(`Found ${warningText} and ${errorText}.`);

        if (errorCount > 0) {
            // process.exitCode = 1;
        }
    }
}

function formatSeverity(severity: string): string {
    return `[${severity}]`;
}

const maxWidth = Math.max(...ALL_SEVERITIES.map((s) => formatSeverity(s).length));

function padSeverity(label: string): string {
    return label.padEnd(maxWidth);
}
