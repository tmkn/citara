import z from "zod";

export const NpmPackageMetadataSchema = z
    .object({
        name: z.string(),
        // values are unknown to avoid validating every manifest eagerly
        // the resolved version is validated later with NpmManifestSchema
        versions: z.record(z.string(), z.unknown()),
        "dist-tags": z.record(z.string(), z.string()).optional(),
    })
    .loose();

export type NpmPackageMetadata = z.infer<typeof NpmPackageMetadataSchema>;

export const NpmManifestSchema = z
    .object({
        name: z.string(),
        version: z.string(),
    })
    .loose();

export type NpmManifest = z.infer<typeof NpmManifestSchema>;

export const DependenciesSchema = z.record(z.string(), z.string());

export type Dependencies = z.infer<typeof DependenciesSchema>;
