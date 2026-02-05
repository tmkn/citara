import { type SessionMeta } from "./session-meta.js";
import { DependencyGraph } from "../graph/dependency-graph.js";
import { type ProcessorError } from "./processor-error.js";

export class AnalysisSession {
    readonly meta: SessionMeta;
    readonly errors: ProcessorError[] = [];

    private _graph?: DependencyGraph;

    constructor(opts: { meta: SessionMeta }) {
        this.meta = opts.meta;
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
}
