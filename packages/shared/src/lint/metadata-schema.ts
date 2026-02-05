export type KeyValueMetadata = {
    type: "key-value";
    title?: string;
    items: Record<string, string | number>;
};

export type MarkdownMetadata = {
    type: "markdown";
    content: string;
};

export type CodeSnippetMetadata = {
    type: "code-snippet";
    language: string;
    code: string;
    title?: string;
    highlightLines?: number[];
};

export type DiagnosticMetadata = KeyValueMetadata | MarkdownMetadata | CodeSnippetMetadata;
