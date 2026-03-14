import type { DiagnosticMetadata } from "./metadata-schema.js";

export interface LintMessageContext {
    message: string;

    metadata?: DiagnosticMetadata[];
}

type LintMessage = string | LintMessageContext;

export type LintResult = LintMessage | LintMessage[];
