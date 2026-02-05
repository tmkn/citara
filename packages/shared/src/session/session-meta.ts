export type SessionMeta = {
    target: string;
    requested: string;
    resolvedVersion: string | null;
    configHash: string;
    timestamp: number;
    depth?: number;
    dependencyType?: string;
};
