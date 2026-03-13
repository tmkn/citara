import type { ExecutionContext } from "../context/execution-context.js";
import { ScopedLogger } from "../context/logger.js";
import type { Processor } from "../processors/processor.js";
import type { Reporter } from "../reporters/reporter.js";
import type { AnalysisSession } from "../session/analysis-session.js";
import { sortProcessors } from "./sort-processors.js";

export class AnalysisEngine {
    constructor(private readonly reporters: readonly Reporter[]) {}

    async run(ctx: ExecutionContext, sessions: AnalysisSession[]): Promise<boolean> {
        ctx.logger.start?.();

        try {
            for (const session of sessions) {
                await this.runSession(ctx, session);
            }
        } finally {
            ctx.logger.stop?.();
        }

        const hasFatalErrors = sessions.some((session) =>
            session.errors.some((error) => error.fatal),
        );

        if (hasFatalErrors) {
            ctx.logger.error?.(
                "One or more packages encountered a fatal error. Skipping reporters.",
            );
            return false;
        }

        const hasLintErrors = sessions.some((session) =>
            session.diagnostics.some((d) => d.severity === "error"),
        );

        for (const reporter of this.reporters) {
            await reporter.report(sessions);
        }

        return !hasLintErrors;
    }

    private async runSession(ctx: ExecutionContext, session: AnalysisSession): Promise<void> {
        let sortedProcessors: Processor[];

        try {
            sortedProcessors = sortProcessors(session.processors);
        } catch (err) {
            const rawMessage = err instanceof Error ? err.message : String(err);

            session.addError({
                processor: "engine",
                message: rawMessage,
                fatal: true,
            });

            ctx.logger.error?.(`[${session.meta.target}] Initialization failed: ${rawMessage}`);
            return;
        }

        for (const processor of sortedProcessors) {
            ctx.logger.info(
                `[${session.meta.target}@${session.meta.requested}] Running processor: ${processor.name}`,
            );

            try {
                const scopedLogger = new ScopedLogger(ctx.logger, processor.name);
                const processorCtx: ExecutionContext = { ...ctx, logger: scopedLogger };

                await processor.run(processorCtx, session);
            } catch (err) {
                const rawMessage = err instanceof Error ? err.message : String(err);
                const isFatal = true;

                ctx.logger.error?.(
                    `[${session.meta.target}] Fatal Error in '${processor.name}' processor: ${rawMessage}`,
                );

                session.addError({
                    processor: processor.name,
                    message: rawMessage,
                    fatal: isFatal,
                });

                if (isFatal) {
                    return;
                }
            }
        }
    }
}
