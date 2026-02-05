import type { ExecutionContext } from "../context/execution-context.js";
import type { Reporter } from "../reporters/reporter.js";
import type { AnalysisSession } from "../session/analysis-session.js";
import type { ProcessorPhase } from "./processor-phase.js";

export class AnalysisEngine {
    constructor(private readonly reporters: readonly Reporter[]) {}

    async run(ctx: ExecutionContext, sessions: AnalysisSession[]): Promise<void> {
        ctx.logger.start?.();

        try {
            for (const session of sessions) {
                await this.runSession(ctx, session);
            }
        } finally {
            ctx.logger.stop?.();
        }

        for (const reporter of this.reporters) {
            await reporter.report(sessions);
        }
    }

    private async runSession(ctx: ExecutionContext, session: AnalysisSession): Promise<void> {
        await this.runPhase("graph", ctx, session);
        await this.runPhase("annotate", ctx, session);
    }

    private async runPhase(
        phase: ProcessorPhase,
        ctx: ExecutionContext,
        session: AnalysisSession,
    ): Promise<void> {
        const processors = session.processors.filter((p) => p.phase === phase);

        for (const processor of processors) {
            ctx.logger.info(
                `[${session.meta.target}@${session.meta.requested}] Running processor: ${processor.name}`,
            );

            await processor.run(ctx, session);
        }
    }
}
