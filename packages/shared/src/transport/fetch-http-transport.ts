import type { HttpTransport } from "../context/http-transport.js";
import type { HttpRequest } from "./http-request.js";
import type { HttpResponse } from "./http-response.js";

export class FetchHttpTransport implements HttpTransport {
    async request(req: HttpRequest): Promise<HttpResponse> {
        const res = await fetch(req.url, {
            method: req.method,
            headers: req.headers,
        });

        const body = await res.text();

        return {
            status: res.status,

            body,
        };
    }
}
