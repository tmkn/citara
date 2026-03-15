import chalk from "chalk";

import { formatPackageNode } from "../graph/package-node.js";
import type { Reporter } from "../reporters/reporter.js";
import type { AnalysisSession, Diagnostic } from "../session/analysis-session.js";
import { ALL_SEVERITIES } from "./lint-rule-config.js";

export class LintReporter implements Reporter {
    async report(sessions: readonly AnalysisSession[]): Promise<void> {
        const visited = new Set<string>();
        let duplicates = 0;

        let errorCount = 0;
        let warnCount = 0;

        const activePackageColor = chalk.cyan;

        for (const session of sessions) {
            if (!session.graph) continue;

            const findingsByNode = new Map<string, Diagnostic[]>();

            for (const diagnostic of session.diagnostics) {
                let nodeFindings = findingsByNode.get(diagnostic.nodeId);

                if (!nodeFindings) {
                    nodeFindings = [];
                    findingsByNode.set(diagnostic.nodeId, nodeFindings);
                }

                nodeFindings.push(diagnostic);

                if (diagnostic.severity === "error") {
                    errorCount++;
                } else if (diagnostic.severity === "warn") {
                    warnCount++;
                }
            }

            session.graph.asTree().walk((node, ctx) => {
                const findings = findingsByNode.get(node.id) ?? [];
                if (findings.length === 0) return;

                const divider = " → ";
                const ancestors = ctx.path
                    .map((n) => chalk.grey(formatPackageNode(n)))
                    .join(divider);

                const target = activePackageColor(formatPackageNode(node));
                const fullPath = ancestors ? `${ancestors}${divider}${target}` : target;

                if (visited.has(node.id)) {
                    duplicates++;

                    return;
                }

                visited.add(node.id);

                console.log(fullPath);

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

        if (duplicates > 0) {
            const duplicateMessage = activePackageColor(
                `Note: Omitted ${duplicates} duplicate occurrences across different dependency paths`,
            );
            console.log(`\n${duplicateMessage}\n`);
        }

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
