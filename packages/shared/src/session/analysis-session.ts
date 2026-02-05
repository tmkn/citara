import { type SessionMeta } from "./session-meta.js";
import { DependencyGraph } from "../graph/dependency-graph.js";
import { type ProcessorError } from "./processor-error.js";
import type { Processor } from "../processors/processor.js";

export class AnalysisSession {
    readonly meta: SessionMeta;
    readonly processors: Processor[];
    readonly errors: ProcessorError[] = [];
    private readonly annotations = new Map<string, Record<string, unknown>>();

    private _graph?: DependencyGraph;

    constructor(opts: { meta: SessionMeta; processors?: Processor[] }) {
        this.meta = opts.meta;
        this.processors = opts.processors ?? [];
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

    setAnnotation(nodeId: string, key: string, value: unknown): void {
        let annotations = this.annotations.get(nodeId);

        if (!annotations) {
            annotations = {};
            this.annotations.set(nodeId, annotations);
        }

        annotations[key] = value;
    }

    getAnnotation<T>(nodeId: string, key: string): T | undefined {
        const annotations = this.annotations.get(nodeId);
        return annotations?.[key] as T | undefined;
    }

    getAllAnnotations(nodeId: string): Record<string, unknown> | undefined {
        return this.annotations.get(nodeId);
    }
}
