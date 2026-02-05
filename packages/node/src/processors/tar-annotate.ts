import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream } from "node:stream/web";
import { createGunzip } from "node:zlib";

import tar from "tar-stream";

import type { NpmRegistryClient } from "@repo/shared/common/npm-registry-client";
import type { ExecutionContext } from "@repo/shared/context/execution-context";
import type { Processor } from "@repo/shared/processors/processor";
import type { AnalysisSession } from "@repo/shared/session/analysis-session";
import { defineAnnotation } from "@repo/shared/session/annotation-key";

export const TARBALL_FILES = defineAnnotation<Map<string, ExtractedFile> | null>(
    "tarball.files",
    (value): value is Map<string, ExtractedFile> | null => value instanceof Map || value === null,
);

export type ExtractedFile =
    | { type: "file"; size: number; content: Buffer }
    | { type: "too_large"; size: number };

export class TarAnnotateProcessor implements Processor {
    readonly name = "tar-annotate";
    readonly dependsOn = ["npm-graph"];

    private readonly MAX_FILE_SIZE = 1024 * 1024; // 1MB
    private readonly MAX_FILES = 1000;
    private readonly MAX_TOTAL_SIZE = 10 * 1024 * 1024; // 10MB

    constructor(private readonly registryClient: NpmRegistryClient) {}

    async run(ctx: ExecutionContext, session: AnalysisSession): Promise<void> {
        const graph = session.graph;

        for (const node of graph.getNodes()) {
            const manifest = await this.registryClient.fetchManifest(node.name, node.version, ctx);

            const tarballUrl = (manifest as any).dist?.tarball;

            if (!tarballUrl) {
                session.setAnnotation(node.id, TARBALL_FILES.key, null);
                continue;
            }

            ctx.logger.info(`Downloading tarball: ${node.id}`);

            const files = await this.downloadAndExtract(tarballUrl);

            session.setAnnotation(node.id, TARBALL_FILES.key, files);
        }
    }

    private async downloadAndExtract(tarballUrl: string): Promise<Map<string, ExtractedFile>> {
        const res = await fetch(tarballUrl);

        if (!res.ok || !res.body) {
            throw new Error(`Failed to download ${tarballUrl}`);
        }

        const extract = tar.extract();
        const files = new Map<string, ExtractedFile>();

        let fileCount = 0;
        let totalSize = 0;

        const done = new Promise<Map<string, ExtractedFile>>((resolve, reject) => {
            extract.on("entry", (header, stream, next) => {
                fileCount++;

                if (fileCount > this.MAX_FILES) {
                    stream.resume();
                    return next();
                }

                const name = header.name.replace(/^package\//, "");
                const size = header.size ?? 0;

                if (size > this.MAX_FILE_SIZE) {
                    files.set(name, {
                        type: "too_large",
                        size,
                    });

                    stream.resume();
                    return next();
                }

                if (totalSize + size > this.MAX_TOTAL_SIZE) {
                    stream.resume();
                    return next();
                }

                const chunks: Buffer[] = [];

                stream.on("data", (chunk) => {
                    chunks.push(chunk);
                });

                stream.on("end", () => {
                    const content = Buffer.concat(chunks);

                    totalSize += content.length;

                    files.set(name, {
                        type: "file",
                        size: content.length,
                        content,
                    });

                    next();
                });

                stream.on("error", reject);
            });

            extract.on("finish", () => resolve(files));
            extract.on("error", reject);
        });

        const nodeStream = Readable.fromWeb(res.body as ReadableStream);

        await pipeline(nodeStream, createGunzip(), extract);

        return done;
    }
}
