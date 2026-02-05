import type { ExecutionContext } from "../context/execution-context.js";
import type { AnalysisSession } from "../session/analysis-session.js";

export interface Processor {
    readonly name: string;
    readonly dependsOn?: string[];
    run(ctx: ExecutionContext, session: AnalysisSession): Promise<void>;
}
