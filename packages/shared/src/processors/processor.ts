import { type ExecutionContext } from "../context/execution-context.js";
import { AnalysisSession } from "../session/analysis-session.js";
import { type ProcessorPhase } from "../engine/processor-phase.js";

export interface Processor {
    readonly name: string;
    readonly phase: ProcessorPhase;
    run(ctx: ExecutionContext, session: AnalysisSession): Promise<void>;
}
