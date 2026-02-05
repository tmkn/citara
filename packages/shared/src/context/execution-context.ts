import { type HttpTransport } from "./http-transport.js";
import { type Logger } from "./logger.js";

export interface ExecutionContext {
    readonly http: HttpTransport;
    readonly logger: Logger;
}
