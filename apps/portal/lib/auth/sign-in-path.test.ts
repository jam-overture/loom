import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * The throttle is only a throttle if every comparison against the roster goes
 * through it. A second sign-in path — a new action, a debug route, an API
 * handler for a CLI — would be unthrottled and would look exactly like the
 * first one.
 *
 * So this reads the source and holds the shape down: `authenticate` is called
 * in one place, and that place hands it to `attemptSignIn` rather than calling
 * it directly. Crude, and the same crude that `guarded-pages.test.ts` is — it is
 * the check that runs without a browser, a session and a server, which is what
 * makes it a check that runs at all.
 *
 * `/primitives` shipped without `requireActor` within a day of 0027 landing.
 * This is the equivalent guard for 0034.
 */
const PORTAL = join(process.cwd())

const sourcesUnder = (directory: string): readonly string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)

    if (entry.name === "node_modules" || entry.name === ".next") return []
    if (entry.isDirectory()) return sourcesUnder(path)

    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : []
  })

/** Where the roster comparison is defined, and the one place entitled to call it. */
const DEFINES = join(PORTAL, "lib", "auth", "roster.ts")
const CALLS = join(PORTAL, "lib", "auth", "identity.ts")

describe("the sign-in path", () => {
  const sources = [...sourcesUnder(join(PORTAL, "lib")), ...sourcesUnder(join(PORTAL, "app"))]

  it("finds the sources at all, so an empty sweep cannot pass silently", () => {
    expect(sources.length).toBeGreaterThan(20)
  })

  it("compares a key against the roster in exactly one place", () => {
    const callers = sources.filter(
      (path) => path !== DEFINES && readFileSync(path, "utf8").includes("authenticate(")
    )

    expect(callers).toEqual([CALLS])
  })

  it("hands that comparison to attemptSignIn rather than making it itself", () => {
    const source = readFileSync(CALLS, "utf8")

    expect(source).toContain("attemptSignIn(")
    expect(source).toMatch(/attemptSignIn\([\s\S]*authenticate\(/)
  })
})
