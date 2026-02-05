import { type SessionMeta } from "./session-meta.js";
import { DependencyGraph } from "../graph/dependency-graph.js";
import { type ProcessorError } from "./processor-error.js";
import type { Processor } from "../processors/processor.js";
import type { AnnotationKey } from "./annotation-key.js";

export interface Diagnostic {
    ruleId: string;
    nodeId: string;
    severity: "warn" | "error";
    message: string;
}

export class AnalysisSession {
    readonly meta: SessionMeta;
    readonly processors: Processor[];
    readonly errors: ProcessorError[] = [];

    readonly diagnostics: Diagnostic[] = [];

    private readonly annotations = new Map<string, Map<symbol, unknown>>();
    private _graph?: DependencyGraph;

    constructor(opts: { meta: SessionMeta; processors?: Processor[] }) {
        this.meta = opts.meta;
        this.processors = opts.processors ?? [];
    }

    addDiagnostic(diagnostic: Diagnostic): void {
        this.diagnostics.push(diagnostic);
    }

    setGraph(graph: DependencyGraph): void {
        if (this._graph) {
            throw new Error("DependencyGraph already set");
        }
        this._graph = graph;
    }

    get graph(): DependencyGraph {
        if (!this._graph) {
            throw new Error("DependencyGraph not initialized yet");
        }
        return this._graph;
    }

    setAnnotation<K extends AnnotationKey<any>>(
        nodeId: string,
        key: K,
        value: K extends AnnotationKey<infer T> ? T : never,
    ): void {
        if (key.validate && !key.validate(value)) {
            throw new Error(`Invalid value for annotation "${key.description}"`);
        }

        const nodeAnnotations = this.ensureNodeAnnotations(nodeId);

        if (nodeAnnotations.has(key.id)) {
            throw new Error(`Annotation "${key.description}" already exists for node ${nodeId}`);
        }

        nodeAnnotations.set(key.id, value);
    }

    getAnnotation<T>(nodeId: string, key: AnnotationKey<T>): T | undefined {
        const nodeAnnotations = this.annotations.get(nodeId);

        const value = nodeAnnotations?.get(key.id);

        if (value === undefined) {
            return undefined;
        }

        return value as T;
    }

    getAllAnnotations(nodeId: string): Record<string, unknown> | undefined {
        const nodeAnnotations = this.annotations.get(nodeId);

        if (!nodeAnnotations) {
            return undefined;
        }

        const result: Record<string, unknown> = {};

        for (const [symbolKey, value] of nodeAnnotations.entries()) {
            const key = Symbol.keyFor(symbolKey) ?? symbolKey.toString();
            result[key] = value;
        }

        return result;
    }

    private ensureNodeAnnotations(nodeId: string): Map<symbol, unknown> {
        let nodeAnnotations = this.annotations.get(nodeId);

        if (!nodeAnnotations) {
            nodeAnnotations = new Map();
            this.annotations.set(nodeId, nodeAnnotations);
        }

        return nodeAnnotations;
    }

    requireAnnotation<T>(nodeId: string, key: AnnotationKey<T>): T {
        const value = this.getAnnotation(nodeId, key);

        if (value === undefined) {
            throw new Error(`Missing annotation "${key.description}" for node ${nodeId}`);
        }

        return value;
    }
}
