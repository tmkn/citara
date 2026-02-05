import * as semver from "semver";
import { QueryClient } from "@tanstack/query-core";

import type { ExecutionContext } from "../context/execution-context.js";
import type { NpmManifest, NpmPackageMetadata } from "../processors/npm-graph-processor.js";

export interface NpmRegistryClient {
    fetchManifest(name: string, range: string, ctx: ExecutionContext): Promise<NpmManifest>;
}

export class CachedNpmRegistryClient implements NpmRegistryClient {
    private readonly _queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: 3,
                retryDelay: 0,
                staleTime: Infinity,
            },
        },
    });

    async fetchManifest(name: string, range: string, ctx: ExecutionContext): Promise<NpmManifest> {
        const metadata = await this.fetchMetadata(name, ctx);

        const resolvedVersion = this.resolveVersion(metadata, range);

        const manifest = metadata.versions[resolvedVersion];

        if (!manifest) {
            throw new Error(`Resolved version ${resolvedVersion} not found for ${name}`);
        }

        return manifest;
    }

    private async fetchMetadata(name: string, ctx: ExecutionContext): Promise<NpmPackageMetadata> {
        return this._queryClient.fetchQuery({
            queryKey: ["npm-metadata", name],
            queryFn: async () => {
                const res = await ctx.http.request({
                    url: `https://registry.npmjs.org/${name}`,
                    method: "GET",
                });

                if (res.status !== 200) {
                    throw new Error(`Failed to fetch package metadata for ${name}: ${res.status}`);
                }

                return JSON.parse(res.body as string) as NpmPackageMetadata;
            },
        });
    }

    private resolveVersion(metadata: NpmPackageMetadata, range: string): string {
        // dist-tags support (latest, next, beta, etc.)
        const tag = metadata["dist-tags"]?.[range];
        if (tag) return tag;

        const versions = Object.keys(metadata.versions);

        const resolved = semver.maxSatisfying(versions, range);

        if (!resolved) {
            throw new Error(`Could not resolve version for ${metadata.name}@${range}`);
        }

        return resolved;
    }
}
