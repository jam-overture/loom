import { readdirSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { portalScreens, screenSource } from "./_lib/screen-source"

/**
 * Every address this route group sends somebody to, held against the addresses
 * it serves.
 *
 * ## The bug this is for
 *
 * Registering an application worked on 14 October, wrote a project and an
 * application, and landed the person on **Not found**. Its action redirected to
 * `/portal/${applicationId}`, and unit 0 had deleted `/portal/[application]` the
 * day before with nineteen other screens.
 *
 * Nothing caught it, and the reason is worth keeping in mind for the units
 * ahead: a deletion sweep follows *imports*, and an address assembled out of a
 * template literal is not an import. The typechecker cannot see it, the screen
 * sweeps do not read it, and the only thing that fails is a person clicking the
 * button — which is how this one was found.
 *
 * ## What it reads, and what it cannot
 *
 * **Every source file in the group, not every screen** — which is the whole
 * point, and the first version of this test got it wrong. The bug was in
 * `new/actions.ts`, and an action is not a `page.tsx`, so a sweep over
 * `portalScreens()` read right past it and passed. It was caught by stashing
 * the fix and watching the new test stay green.
 *
 * Literal `redirect(...)` and `href=` targets, compared with the routes
 * `portalScreens()` finds on disk. A dynamic segment matches any
 * one path segment, so `/portal/preview/[project]` covers
 * `/portal/preview/${projectId}`.
 *
 * It cannot see an address built from a variable the file does not spell —
 * `redirect(somewhereElse)` is opaque here. That is a smaller hole than the one
 * it closes, and naming it is better than pretending the sweep is total.
 *
 * It reads through `screenSource`, which strips comments — so the docblock in
 * `new/actions.ts` explaining which address it used to use does not read as the
 * address it uses.
 */

const ROUTE_PATTERNS: readonly RegExp[] = portalScreens().map(
  (screen) =>
    new RegExp(`^${screen.route.replace(/\[\[?\.\.\.[^\]]+\]\]?/gu, "[^?]*").replace(/\[[^\]]+\]/gu, "[^/?]+")}$`, "u")
)

const served = (path: string): boolean => ROUTE_PATTERNS.some((pattern) => pattern.test(path))

/**
 * A path this group points at, with its query and hash dropped and every
 * interpolation standing in as one segment.
 *
 * `/portal/preview/${project.id}` is read as `/portal/preview/x`, which the
 * pattern for `/portal/preview/[project]` matches — so a dynamic address is
 * checked rather than skipped, and a *truncated* one cannot pass by being
 * unrecognisable.
 */
const pathsIn = (source: string): readonly string[] =>
  [
    ...source.matchAll(/redirect\(\s*([`"'])((?:[^`"'\\]|\\.)*)\1/gu),
    ...source.matchAll(/href=\{?\s*([`"'])((?:[^`"'\\]|\\.)*)\1/gu),
  ]
    .map((match) => (match[2] ?? "").replace(/\$\{[^}]*\}/gu, "x"))
    .map((path) => path.split(/[?#]/u)[0] ?? "")
    .filter((path) => path.startsWith("/portal"))

const GROUP = fileURLToPath(new URL(".", import.meta.url))

/** Every source file in the group, tests excluded — they name dead routes on purpose. */
const sourcesIn = (directory: string, prefix = ""): readonly string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const here = prefix === "" ? entry.name : `${prefix}/${entry.name}`

    if (entry.isDirectory()) return sourcesIn(`${directory}/${entry.name}`, here)

    return /\.tsx?$/u.test(entry.name) && !/\.test\.tsx?$/u.test(entry.name) ? [here] : []
  })

describe("every address this group sends somebody to", () => {
  const files = sourcesIn(GROUP)

  /** Counted rather than assumed: a sweep that reads nothing passes for ever. */
  it("reads the whole group, so an empty sweep cannot pass as clean", () => {
    expect(files.length).toBeGreaterThan(20)
    expect(files).toContain("portal/new/actions.ts")
  })

  it("points only at routes this portal serves", () => {
    const wrong = files.flatMap((file) =>
      pathsIn(screenSource(`${GROUP}${file}`))
        .filter((path) => !served(path))
        .map((path) => `${file} → ${path}`)
    )

    expect(wrong).toEqual([])
  })
})
