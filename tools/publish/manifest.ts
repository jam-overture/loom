import { z } from "zod"

import { err, ok, type Result } from "../../src/result.js"

/**
 * What this package promises the registry, read as data rather than trusted.
 *
 * A published package is the one artefact in this repository that cannot be
 * corrected by pushing a commit: a version is immutable once it is on the
 * registry, and the only remedies afterwards are a deprecation and a new
 * number. So the shape of what goes out is held here, beside a test, rather
 * than in a person's memory of what `pnpm publish` was going to do.
 *
 * The mechanism it guards is `publishConfig`, which pnpm applies at publish
 * time: the manifest in the repository advertises `./primitives` so the
 * workspace's five surfaces can import it, and the manifest in the tarball
 * does not, because the starter library is not part of the framework and ships
 * separately (0194). Two manifests that differ deliberately are one rename away
 * from differing accidentally, and the accident is invisible — it is a subpath
 * a consumer cannot import, discovered by the consumer.
 */

const exportTargetSchema = z.union([
  z.string(),
  z.record(z.string(), z.string()),
])

const manifestSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  private: z.boolean().optional(),
  license: z.string().min(1).optional(),
  repository: z.union([z.string(), z.object({ url: z.string() }).passthrough()]).optional(),
  files: z.array(z.string()).optional(),
  bin: z.record(z.string(), z.string()).optional(),
  exports: z.record(z.string(), exportTargetSchema),
  publishConfig: z
    .object({
      access: z.string().optional(),
      exports: z.record(z.string(), exportTargetSchema).optional(),
    })
    .optional(),
})

export type PackageManifest = z.infer<typeof manifestSchema>

export const parseManifest = (source: unknown): Result<PackageManifest, string> => {
  const parsed = manifestSchema.safeParse(source)

  return parsed.success
    ? ok(parsed.data)
    : err(parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "))
}

/**
 * The subpaths a consumer gets, which is `publishConfig.exports` when it is
 * there and the repository's own map when it is not. Absent rather than empty
 * is the case worth being careful about: a `publishConfig` with no `exports`
 * publishes the full map, and reading it as "nothing is published" would make
 * this file assert the opposite of the truth.
 */
export const publishedExports = (manifest: PackageManifest): Readonly<Record<string, unknown>> =>
  manifest.publishConfig?.exports ?? manifest.exports

/** Subpaths the repository resolves and the registry will not, newest first in the map's own order. */
export const withheldSubpaths = (manifest: PackageManifest): readonly string[] => {
  const published = new Set(Object.keys(publishedExports(manifest)))

  return Object.keys(manifest.exports).filter((subpath) => !published.has(subpath))
}

/** Subpaths in `publishConfig.exports` that the repository's own map does not have. */
export const inventedSubpaths = (manifest: PackageManifest): readonly string[] => {
  const repository = new Set(Object.keys(manifest.exports))

  return Object.keys(publishedExports(manifest)).filter((subpath) => !repository.has(subpath))
}

/** `files` entries that begin with `!`, with the marker removed. */
export const packExclusions = (manifest: PackageManifest): readonly string[] =>
  (manifest.files ?? [])
    .filter((pattern) => pattern.startsWith("!"))
    .map((pattern) => pattern.slice(1).replace(/^\.\//, ""))

const targetsOf = (entry: unknown): readonly string[] => {
  if (typeof entry === "string") return [entry]
  if (entry === null || typeof entry !== "object") return []

  return Object.values(entry as Record<string, unknown>).flatMap(targetsOf)
}

/** Every file a published subpath names, conditions flattened, leading `./` removed. */
export const publishedTargets = (manifest: PackageManifest): readonly string[] =>
  Object.values(publishedExports(manifest))
    .flatMap(targetsOf)
    .map((target) => target.replace(/^\.\//, ""))

export type PublicationFault =
  | { readonly code: "still-private" }
  | { readonly code: "no-license" }
  | { readonly code: "no-repository" }
  | { readonly code: "invented-subpath"; readonly subpath: string }
  | { readonly code: "withheld-but-packed"; readonly subpath: string; readonly target: string }
  | { readonly code: "published-but-excluded"; readonly subpath: string; readonly target: string }

export const describePublicationFault = (fault: PublicationFault): string => {
  switch (fault.code) {
    case "still-private":
      return "`private: true` — the registry refuses this, and it is the field that makes the whole manifest a draft"
    case "no-license":
      return "no `license` — a public package with no licence grants nobody the right to use it"
    case "no-repository":
      return "no `repository` — the registry page has nowhere to send a reader"
    case "invented-subpath":
      return `publishConfig.exports adds \`${fault.subpath}\`, which the repository's own exports do not have: a consumer would get a subpath nothing in this workspace resolves`
    case "withheld-but-packed":
      return `\`${fault.subpath}\` is withheld from the published exports and \`${fault.target}\` is still packed: code ships that nothing can import`
    case "published-but-excluded":
      return `\`${fault.subpath}\` is published and \`${fault.target}\` is excluded from the tarball by \`files\`: the subpath resolves to nothing`
  }
}

const isUnder = (target: string, directory: string): boolean =>
  target === directory || target.startsWith(`${directory}/`)

/**
 * Everything wrong with publishing this manifest as it stands.
 *
 * The two that matter are the pair either side of the `publishConfig` seam, and
 * they are opposites: code that ships with no way to import it, and a subpath
 * that imports nothing. Neither is visible in the repository, where both
 * manifests' claims happen to be true.
 */
export const publicationFaults = (manifest: PackageManifest): readonly PublicationFault[] => {
  const faults: PublicationFault[] = []

  if (manifest.private === true) faults.push({ code: "still-private" })
  if (manifest.license === undefined) faults.push({ code: "no-license" })
  if (manifest.repository === undefined) faults.push({ code: "no-repository" })

  for (const subpath of inventedSubpaths(manifest)) {
    faults.push({ code: "invented-subpath", subpath })
  }

  const exclusions = packExclusions(manifest)

  for (const subpath of withheldSubpaths(manifest)) {
    for (const target of targetsOf(manifest.exports[subpath]).map((t) => t.replace(/^\.\//, ""))) {
      if (!exclusions.some((excluded) => isUnder(target, excluded))) {
        faults.push({ code: "withheld-but-packed", subpath, target })
      }
    }
  }

  for (const [subpath, entry] of Object.entries(publishedExports(manifest))) {
    for (const target of targetsOf(entry).map((t) => t.replace(/^\.\//, ""))) {
      if (exclusions.some((excluded) => isUnder(target, excluded))) {
        faults.push({ code: "published-but-excluded", subpath, target })
      }
    }
  }

  return faults
}
