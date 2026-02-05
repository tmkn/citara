export type SessionMeta = {
    target: string;
    requested: string;
    resolvedVersion: string | null;
    // TODO: Hash of analysis configuration for cache invalidation
    configHash: string;
    timestamp: number;
    depth?: number;
    dependencyType?: string;
};
