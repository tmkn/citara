import { type HttpRequest } from "../transport/http-request.js";
import { type HttpResponse } from "../transport/http-response.js";

export interface HttpTransport {
    request(req: HttpRequest): Promise<HttpResponse>;
}
