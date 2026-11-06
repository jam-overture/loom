import { readdirSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

/** This repository's root, from this file's own location rather than a cwd. */
export const ROOT = fileURLToPath(new URL("../../", import.meta.url))

/**
 * Every TypeScript source under a directory.
 *
 * The sweeps in this directory read the repository rather than a list someone
 * maintains, which is the only version that covers the file nobody remembered.
 */
export const sourcesUnder = (directory: string): readonly string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)

    if (entry.isDirectory()) {
      return entry.name === "node_modules" || entry.name === ".next" ? [] : sourcesUnder(path)
    }

    return entry.name.endsWith(".ts") || entry.name.endsWith(".tsx") ? [path] : []
  })

/**
 * Everywhere in this repository that holds TypeScript the maintainer writes.
 *
 * `src/` and `tools/` are the framework and its tooling; `apps/loom/` is the one
 * application the four surfaces share (0067). A sweep that reads all three is
 * reading a property of the repository rather than of one lane — which is why
 * these checks live here, in the lane that owns the repository's own tooling,
 * and not in any route group. No file under another lane's directory is edited
 * by anything here.
 *
 * **Declaration files are left out because they are generated.** `next build`
 * writes `apps/loom/next-env.d.ts`, which is git-ignored and full of
 * semicolons, so the first sweep after a build read a file no lane wrote — found
 * by the semicolon check failing on itself, which is the check working. Nothing
 * is lost: git tracks no `.d.ts` in this repository, so a declaration file here
 * is always a tool's output rather than somebody's style.
 */
export const everySource = (): readonly string[] =>
  [
    ...sourcesUnder(join(ROOT, "src")),
    ...sourcesUnder(join(ROOT, "tools")),
    ...sourcesUnder(join(ROOT, "apps", "loom")),
  ].filter((path) => !path.endsWith(".d.ts"))

/** The path as a report should print it: relative to the repository root. */
export const relative = (path: string): string => path.slice(ROOT.length)
