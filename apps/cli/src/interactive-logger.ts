import ora from "ora";
import type { Logger } from "@repo/shared/context/logger";

export class InteractiveLogger implements Logger {
    private spinner = ora();

    start(): void {
        this.spinner.start();
    }

    stop(): void {
        this.spinner.stop();
    }

    info(message: string): void {
        if (this.spinner.isSpinning) {
            this.spinner.text = message;
        } else {
            console.log(message);
        }
    }

    warn(message: string): void {
        const wasSpinning = this.spinner.isSpinning;
        if (wasSpinning) {
            this.spinner.stop();
        }
        console.warn(message);
        if (wasSpinning) {
            this.spinner.start();
        }
    }

    error(message: string): void {
        const wasSpinning = this.spinner.isSpinning;
        if (wasSpinning) {
            this.spinner.stop();
        }
        console.error(message);
        if (wasSpinning) {
            this.spinner.start();
        }
    }
}
