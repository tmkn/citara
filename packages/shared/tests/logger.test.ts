import { describe, test, expect, vi } from "vitest";

import { scopedLogger, type Logger } from "../src/context/logger.js";

describe("scopedLogger", () => {
    test.each([
        ["info", "info message"],
        ["warn", "warn message"],
        ["error", "error message"],
    ] as const)("prefixes %s messages with the scope", (method, message) => {
        const base = {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
        } satisfies Logger;

        const logger = scopedLogger(base, "processor");

        logger[method](message);

        expect(base[method]).toHaveBeenCalledWith(`[processor] ${message}`);
    });
});
