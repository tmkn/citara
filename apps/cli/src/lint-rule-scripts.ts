import { defineRule } from "@repo/shared/lint/define-rule";

export interface PostinstallParams {
    maxLength: number;
}

export interface PostinstallData {
    exists: boolean;
    scriptLength: number;
    rawScript?: string;
}

export const noPostinstallRule = defineRule<PostinstallParams, PostinstallData>({
    id: "no-postinstall-script",

    annotate(node) {
        const script = node.manifest.get<string>("scripts.postinstall");

        if (!script) {
            return { exists: false, scriptLength: 0 };
        }

        return {
            exists: true,
            scriptLength: script.length,
            rawScript: script,
        };
    },

    check(node, ctx) {
        const { data, params } = ctx;

        if (!data?.exists || !data.rawScript) {
            return;
        }

        if (data.scriptLength > params.maxLength) {
            const snippet = `"scripts": {\n  "postinstall": "${data.rawScript}"\n}`;

            return {
                message: `The \`postinstall\` script exceeds the maximum allowed length of ${params.maxLength} characters: '${data.rawScript}'`,
                metadata: [
                    {
                        type: "key-value",
                        title: "Script Metrics",
                        items: {
                            "Configured Max Length": params.maxLength,
                            "Actual Length": data.scriptLength,
                            "Excess Characters": data.scriptLength - params.maxLength,
                        },
                    },
                    {
                        type: "code-snippet",
                        title: `${node.id} - package.json`,
                        language: "json",
                        code: snippet,
                        highlightLines: [2],
                    },
                ],
            };
        }
    },
});
