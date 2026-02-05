import chalk from "chalk";
import type { Reporter } from "../reporters/reporter.js";
import type { AnalysisSession } from "../session/analysis-session.js";
import { ALL_SEVERITIES, type LintRuleConfig, type LintSeverity } from "./lint-rule-config.js";

interface Finding {
    ruleId: string;
    severity: LintSeverity;
    message?: string;
}

export class LintReporter implements Reporter {
    constructor(private readonly ruleConfigs: readonly LintRuleConfig[]) {}

    async report(sessions: readonly AnalysisSession[]): Promise<void> {
        if (sessions.length !== this.ruleConfigs.length) {
            console.warn(
                `[Warning] Length mismatch: ${sessions.length} sessions vs ${this.ruleConfigs.length} ruleConfigs.`,
            );
        }

        let errorCount = 0;
        let warnCount = 0;

        // Assume all sessions analyze the same graph structure
        const referenceSession = sessions[0];
        if (!referenceSession) return;

        const findingsByNode = new Map<string, Finding[]>();

        for (const node of referenceSession.graph.getNodes()) {
            findingsByNode.set(node.id, []);
        }

        // Collect findings
        sessions.forEach((session, index) => {
            const ruleConfig = this.ruleConfigs[index]!;
            const { rule, severity, options } = ruleConfig;

            for (const node of session.graph.getNodes()) {
                const result = rule.check(node, options);

                // we have reportings
                if (result !== undefined) {
                    const annotation = session.getAnnotation(node.id, `lint.${rule.id}`);

                    findingsByNode.get(node.id)!.push({
                        ruleId: rule.id,
                        severity,
                        message: Array.isArray(result) ? result.join("\n") : result,
                    });

                    if (severity === "error") errorCount++;
                    else warnCount++;
                }
            }
        });

        // Print grouped by path (tree traversal)
        referenceSession.graph.asTree().walk((node, ctx) => {
            const findings = findingsByNode.get(node.id)!;

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
