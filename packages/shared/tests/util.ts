import { vi } from "vitest";

import type { ExecutionContext } from "../src/context/execution-context.js";
import type { HttpTransport } from "../src/context/http-transport.js";
import type { Logger } from "../src/context/logger.js";
import type { NpmGraphProcessor } from "../src/processors/npm-graph-processor.js";
import { AnalysisSession } from "../src/session/analysis-session.js";
import type { HttpRequest } from "../src/transport/http-request.js";
import type { HttpResponse } from "../src/transport/http-response.js";

const mockLogger: Logger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
};

export function createContext(manifests: Record<string, any>): ExecutionContext {
    const http: HttpTransport = {
        request: async (req: HttpRequest): Promise<HttpResponse> => {
            const parts = req.url.split("/");

            let name = parts.pop()!;

            // reconstruct scoped packages
            if (parts[parts.length - 1]?.startsWith("@")) {
                name = `${parts.pop()}/${name}`;
            }

            const metadata = manifests[name];

            if (!metadata) {
                return { status: 404, body: "{}" };
            }

            return {
                status: 200,
                body: JSON.stringify(metadata),
            };
        },
    };

    return {
        http,
        logger: mockLogger,
    };
}

export function createSession(
    processor: NpmGraphProcessor,
    target: string,
    metaOverrides: Partial<AnalysisSession["meta"]> = {},
) {
    return new AnalysisSession({
        meta: {
            target,
            requested: "1.0.0",
            resolvedVersion: null,
            configHash: "test",
            timestamp: Date.now(),
            ...metaOverrides,
        },
        processors: [processor],
    });
}
