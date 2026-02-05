import type { PackageNode } from "../graph/package-node.js";
import type { AnalysisSession } from "../session/analysis-session.js";
import { type Reporter } from "./reporter.js";

export class TreeReporter implements Reporter {
    async report(sessions: readonly AnalysisSession[]): Promise<void> {
        for (const session of sessions) {
            const root = session.graph.getRoot();
            const tree = session.graph.asTree();

            console.log(`\n${this.formatLine(session, root)}`);

            const prefixStack: string[] = [];

            tree.walk((node, ctx) => {
                if (ctx.depth === 0) return;

                const isLast = ctx.index === ctx.siblingCount - 1;
                const branch = isLast ? "└─ " : "├─ ";
                const prefix = prefixStack.slice(0, ctx.depth - 1).join("");

                if (ctx.isCycle) {
                    console.log(`${prefix}${branch}${this.formatNode(node)} ↩︎ (cycle)`);
                    return;
                }

                console.log(`${prefix}${branch}${this.formatLine(session, node)}`);

                prefixStack[ctx.depth - 1] = isLast ? "   " : "│  ";
            });
        }
    }

    private formatLine(session: AnalysisSession, node: PackageNode): string {
        const base = this.formatNode(node);

        // Only show dependency count for registry nodes
        if (node.source === "registry") {
            const count = session.graph.getDependencies(node.id).length;
            return `${base} (${count} deps)`;
        }

        return base;
    }

    private formatNode(node: { name: string; version: string; source: string }): string {
        if (node.source === "external") {
            return `${node.name}@${node.version} [external]`;
        }

        return `${node.name}@${node.version}`;
    }
}
