import type { ZodType } from "zod";

export class PackageManifest {
    constructor(private readonly raw: unknown) {}

    get<T = unknown>(path: string, defaultValue?: T): T {
        if (typeof this.raw !== "object" || this.raw === null) {
            return defaultValue as T;
        }

        const keys = path.split(".");
        let current: any = this.raw;

        for (const key of keys) {
            if (current === undefined || current === null || typeof current !== "object") {
                return defaultValue as T;
            }
            current = current[key];
        }

        return (current !== undefined ? current : defaultValue) as T;
    }

    parse<T>(schema: ZodType<T>): T {
        return schema.parse(this.raw);
    }

    safeParse<T>(schema: ZodType<T>) {
        return schema.safeParse(this.raw);
    }

    get rawData(): unknown {
        return this.raw;
    }
}
