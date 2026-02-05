import type { AnalysisSession } from "./analysis-session.js";

export interface AnnotationKey<T> {
    readonly id: symbol;
    readonly description: string;
    readonly validate?: (value: unknown) => value is T;
}

function createAnnotationKey<T>(
    description: string,
    validate?: (value: unknown) => value is T,
): AnnotationKey<T> {
    return {
        id: Symbol.for(description),
        description,
        validate,
    };
}

export interface AnnotationDefinition<T> {
    readonly key: AnnotationKey<T>;

    set(session: AnalysisSession, nodeId: string, value: T): void;
    get(session: AnalysisSession, nodeId: string): T | undefined;
    require(session: AnalysisSession, nodeId: string): T;
}

export function defineAnnotation<T>(
    description: string,
    validate?: (value: unknown) => value is T,
): AnnotationDefinition<T> {
    const key = createAnnotationKey<T>(description, validate);

    return {
        key,

        set(session, nodeId, value) {
            session.setAnnotation(nodeId, key, value);
        },

        get(session, nodeId) {
            return session.getAnnotation(nodeId, key);
        },

        require(session, nodeId) {
            return session.requireAnnotation(nodeId, key);
        },
    };
}
