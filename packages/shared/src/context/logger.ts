export interface Logger {
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
    start?(): void;
    stop?(): void;
}

export class ScopedLogger implements Logger {
    constructor(
        private readonly base: Logger,
        private readonly scope: string,
    ) {}

    private prefix(message: string): string {
        return `[${this.scope}] ${message}`;
    }

    info(message: string): void {
        this.base.info(this.prefix(message));
    }

    warn(message: string): void {
        this.base.warn(this.prefix(message));
    }

    error(message: string): void {
        this.base.error(this.prefix(message));
    }

    start?(): void {
        this.base.start?.();
    }

    stop?(): void {
        this.base.stop?.();
    }
}

export function scopedLogger(logger: Logger, scope: string): Logger {
    return new ScopedLogger(logger, scope);
}
