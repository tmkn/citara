import type { ZodType } from "zod";

type LookupResult = { exists: true; value: unknown } | { exists: false };

export class PackageManifest {
    constructor(private readonly raw: unknown) {}

    get(path: string): unknown;
    get<T>(path: string, schema: ZodType<T>): T;
    get<T = unknown>(path: string, schema?: ZodType<T>): T {
        const result = this.lookup(path);

        if (!result.exists) {
            throw new Error(`Path '${path}' does not exist in the manifest.`);
        }

        const value = result.value;

        if (!schema) {
            return value as T;
        }

        return schema.parse(value, {
            error: () => new Error(`Invalid value at path '${path}'`),
        });
    }

    getSafe(path: string): unknown {
        const result = this.lookup(path);
        return result.exists ? result.value : undefined;
    }

    has(path: string): boolean {
        return this.lookup(path).exists;
    }

    private lookup(path: string): LookupResult {
        const keys = path.split(".");
        let current: unknown = this.raw;

        for (const key of keys) {
            if (typeof current !== "object" || current === null) {
                return { exists: false };
            }

            const obj = current as Record<string, unknown>;

            if (!(key in obj)) {
                return { exists: false };
            }

            current = obj[key];
        }

        return { exists: true, value: current };
    }

    get rawData(): unknown {
        return this.raw;
    }
}
