import { defineLintRule } from "../define-rule.js";

type UnsafeScriptsData = { script: string; command: string };

type UnsafeScriptsParams = {
    scripts?: readonly string[];
};

export const HIGH_RISK_NPM_SCRIPTS = [
    "preinstall", // Runs before the package is installed
    "install", // Runs during the installation process
    "postinstall", // Runs after the package is installed
    "prepare", // Runs after install and before publish; also runs when installing from git
    "prepublish", // Runs before publish (historically also during install in older npm versions)
    "prepublishOnly", // Runs only before publishing the package
    "prepack", // Runs before npm creates the package tarball
    "postpack", // Runs after the package tarball is created
] as const;

export const unsafeScripts = defineLintRule<UnsafeScriptsParams, UnsafeScriptsData[]>({
    id: "unsafe-scripts",

    annotate(node, params) {
        const scriptsToCheck = params.scripts ?? HIGH_RISK_NPM_SCRIPTS;
        const findings: UnsafeScriptsData[] = [];

        for (const scriptName of scriptsToCheck) {
            const command = node.manifest.getSafe(`scripts.${scriptName}`);

            if (typeof command !== "string") continue;

            findings.push({
                script: scriptName,
                command,
            });
        }

        return findings;
    },

    check(node, ctx) {
        return ctx.data.map((finding) => {
            return {
                message: `Found "${finding.script}" script: "${finding.command}"`,
            };
        });
    },
});
