import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises"
import { join, posix, relative, sep } from "node:path"

import { manifest, publishedSpecifier, runtimeTarget } from "./manifest.js"

/**
 * Assembling `packages/primitives/` from a build of the runtime — the work, with
 * `main.ts` beside it as the command.
 *
 * **It never publishes.** Publishing is irreversible, it is outward-facing, and
 * two of its preconditions are the maintainer's rather than this repository's —
 * so this produces the artifact and a readiness report, and the last step is a
 * person typing the command the report prints.
 *
 * It does not build the runtime either. `dist/` is `pnpm build`'s output and
 * regenerating it here would mean this tool owning the compiler settings of a
 * package it is only reading; instead it refuses a `dist/` that is missing and
 * names the command that makes one. That is the same call `pnpm shoot --serve`
 * makes about a Next build, for the reason the 25 September finding gives: a
 * tool that quietly rebuilds is a tool that can photograph the wrong thing.
 */

const ROOT = new URL("../../", import.meta.url).pathname
const SOURCE = join(ROOT, "dist", "primitives")
const TARGET = join(ROOT, "packages", "primitives")
const OUT = join(TARGET, "dist")

const exists = async (path: string): Promise<boolean> => {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

const filesUnder = async (dir: string): Promise<readonly string[]> => {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true })

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => posix.join(relative(dir, entry.parentPath).split(sep).join("/"), entry.name))
    .map((path) => (path.startsWith("/") ? path.slice(1) : path))
}

/**
 * Every import and export specifier in an emitted module, rewritten.
 *
 * The pattern matches the three forms `tsc` emits — `from "…"`, a bare
 * `import "…"`, and the `import("…")` a declaration file uses for a type it
 * references but does not import — and nothing else. It is deliberately not a
 * general string replacement: a primitive's own copy contains paths, and
 * `code-band.ts` ships the literal text `@jam-overture/loom` inside a marketing
 * band, so a blunter rewrite would edit the library's *content*.
 */
const SPECIFIER = /(from\s*|import\s*|import\(\s*)(["'])((?:\.\.?\/)[^"']*)\2/g

export const rewrite = (fileDir: string, source: string): string =>
  source.replace(SPECIFIER, (whole, lead: string, quote: string, specifier: string) => {
    const published = publishedSpecifier(fileDir, specifier)

    return published === specifier ? whole : `${lead}${quote}${published}${quote}`
  })

/**
 * The trailing `//# sourceMappingURL=` line, removed with the map it names.
 *
 * Leaving it behind is worse than either shipping the map or dropping both: a
 * bundler that honours the comment reports a missing file on every module in
 * the package, which is a wall of warnings pointing at nothing wrong.
 */
export const withoutMapComment = (source: string): string =>
  source.replace(/\n?\/\/# sourceMappingURL=.*\.map\s*$/, "\n")

export type Assembled = {
  readonly files: number
  readonly rewritten: number
  readonly license: boolean
  readonly packageName: string
  readonly version: string
  readonly peer: string
  readonly peerRange: string
}

export type AssemblyError = { readonly code: "no-build" } | { readonly code: "unmapped"; readonly specifiers: readonly string[] }

/**
 * Assemble the package, and say what it did — a `Result` rather than a process
 * that exits, so the thing that decides the exit code is the command and not
 * the work. It is also what lets this be imported by a test without a build
 * running as a side effect of the import, which is how the first version of
 * this file announced itself.
 */
export const assemble = async (): Promise<{ ok: true; value: Assembled } | { ok: false; error: AssemblyError }> => {
  if (!(await exists(SOURCE))) return { ok: false, error: { code: "no-build" } }

  const license = (await exists(join(ROOT, "LICENSE")))
    ? licenseIdOf(await readFile(join(ROOT, "package.json"), "utf8"))
    : undefined

  await rm(OUT, { recursive: true, force: true })
  await mkdir(OUT, { recursive: true })

  const sources = await filesUnder(SOURCE)
  const unmapped: string[] = []
  let rewritten = 0

  for (const path of sources) {
    const fileDir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : ""
    const from = join(SOURCE, path)
    const to = join(OUT, path)

    await mkdir(join(OUT, fileDir), { recursive: true })

    /**
     * **The maps are dropped, and that is a decision rather than an
     * oversight.** `tsc` emits a `.js.map` and a `.d.ts.map` beside every file,
     * and both name their sources as `../../src/primitives/loom.feature.ts` —
     * a path that exists in this repository and in no published package. A map
     * whose sources are not shipped is not a degraded map, it is a broken one:
     * an editor following it gets nothing, and a debugger reports a missing
     * file rather than falling back cleanly.
     *
     * The two ways to keep them both cost more than they are worth tonight.
     * Shipping `src/primitives/**` alongside would put files carrying
     * `../sdk/definition.js` — specifiers that resolve nowhere outside this
     * repository — into a published package; rewriting each map's `sources` to
     * point at those shipped files is the same idea with more machinery.
     *
     * What a reader loses is a jump into the original TypeScript. What they
     * keep is every declaration file, with every doc comment in it, which is
     * where this library's documentation actually lives. It cuts the tarball
     * by about a third. If somebody wants sources later it is an additive
     * change and this comment is the argument to answer.
     */
    if (path.endsWith(".map")) continue

    if (!/\.(js|d\.ts)$/.test(path)) {
      await cp(from, to)
      continue
    }

    const source = await readFile(from, "utf8")
    const next = withoutMapComment(rewrite(fileDir, source))
    if (next !== source) rewritten += 1

    /**
     * A specifier that climbed out of `dist/` is one this tool cannot name an
     * entry point for, and shipping it would mean publishing a module that
     * resolves to nothing in a host's `node_modules`. It is collected rather
     * than thrown on, so one run names every one of them.
     */
    for (const [, , , specifier] of next.matchAll(SPECIFIER)) {
      if (specifier !== undefined && runtimeTarget(fileDir, specifier) === undefined && specifier.includes("..")) {
        const resolved = posix.join(fileDir === "" ? "primitives" : `primitives/${fileDir}`, specifier)
        if (resolved.startsWith("..")) unmapped.push(`${path}: ${specifier}`)
      }
    }

    await writeFile(to, next, "utf8")
  }

  if (unmapped.length > 0) return { ok: false, error: { code: "unmapped", specifiers: unmapped } }

  await writeFile(
    join(TARGET, "package.json"),
    `${JSON.stringify(manifest(license ?? "UNLICENSED"), null, 2)}\n`,
    "utf8"
  )

  if (license !== undefined) await cp(join(ROOT, "LICENSE"), join(TARGET, "LICENSE"))

  const built: Record<string, unknown> = manifest(license ?? "UNLICENSED")
  const peers = built["peerDependencies"] as Record<string, string>
  const [peer = ""] = Object.keys(peers).filter((name) => name !== "react")

  return {
    ok: true,
    value: {
      files: sources.length,
      rewritten,
      license: license !== undefined,
      packageName: String(built["name"]),
      version: String(built["version"]),
      peer,
      peerRange: peers[peer] ?? "",
    },
  }
}

/**
 * What the package says its license is — read from the runtime's own manifest
 * rather than parsed out of the LICENSE file.
 *
 * The first version of this read an SPDX identifier off the LICENSE's first
 * line, which was a convention this tool invented and the repository did not
 * follow: the file `Loom daily build` shipped opens `MIT License`, the
 * conventional header, which is not a bare identifier. Two packages out of one
 * repository disagreeing about their license is the failure that would have
 * caused, and the fix is to stop having a second source of truth — `license`
 * in the root manifest is what npm publishes for the framework, so it is what
 * this publishes for the library.
 */
export const licenseIdOf = (rootManifest: string): string => {
  const parsed: { license?: unknown } = JSON.parse(rootManifest)

  return typeof parsed.license === "string" && parsed.license.length > 0
    ? parsed.license
    : "SEE LICENSE IN LICENSE"
}

