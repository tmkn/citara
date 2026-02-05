import { type AnalysisSession } from "../session/analysis-session.js";

export interface Reporter {
    report(sessions: readonly AnalysisSession[]): Promise<void>;
}
