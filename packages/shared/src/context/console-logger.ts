import { type Logger } from "./logger.js";

export const consoleLogger: Logger = {
    info(message: string) {
        console.log(message);
    },
    warn(message: string) {
        console.warn(message);
    },
    error(message: string) {
        console.error(message);
    },
};
