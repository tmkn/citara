export type HttpRequest = {
    url: string;
    method?: "GET" | "POST";
    headers?: Record<string, string>;
};
