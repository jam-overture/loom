import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * The throttle is only a throttle if every check of a presented key goes
 * through it. A second sign-in path — a new action, a debug route, an API
 * handler for a CLI — would be unthrottled and would look exactly like the
 * first one.
 *
 * So this reads the source and holds the shape down: the accounts table is
 * asked *whose key is this* in one place, and that place hands the question to
 * `attemptSignIn` rather than asking it directly. Crude, and the same crude
 * that `guarded-pages.test.ts` is — it is the check that runs without a
 * browser, a session and a server, which is what makes it a check that runs at
 * all.
 *
 * `/portal/primitives` shipped without `requireActor` within a day of 0027 landing.
 * This is the equivalent guard for 0034.
 *
 * **Re-aimed by 0285**, which is the moment it earned its keep: the roster
 * became a table and the lookup it guards changed name. A guard written against
 * `authenticate(` would have gone on passing over a portal where nothing called
 * `authenticate` any more.
 */
const PORTAL = join(process.cwd(), "app", "(portal)")

const sourcesUnder = (directory: string): readonly string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)

    if (entry.name === "node_modules" || entry.name === ".next") return []
    if (entry.isDirectory()) return sourcesUnder(path)

    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : []
  })

/**
 * The lookup that turns a presented key into an actor, and the one place
 * entitled to perform it.
 *
 * Named by the method rather than by the module, because there are two
 * implementations of it and a third could be added: what must stay true is that
 * *asking* happens once, wherever the answer comes from.
 */
const ASKS = "actorWithDigest("
const DEFINES = [
  join(PORTAL, "_lib", "auth", "accounts.ts"),
  join(PORTAL, "_lib", "auth", "accounts-memory.ts"),
  join(PORTAL, "_lib", "auth", "accounts-postgres.ts"),
  join(PORTAL, "_lib", "auth", "accounts.contract.ts"),
]
const CALLS = join(PORTAL, "_lib", "auth", "identity.ts")

describe("the sign-in path", () => {
  const sources = sourcesUnder(PORTAL)

  it("finds the sources at all, so an empty sweep cannot pass silently", () => {
    expect(sources.length).toBeGreaterThan(20)
  })

  it("asks the accounts table whose key this is in exactly one place", () => {
    const callers = sources.filter(
      (path) => !DEFINES.includes(path) && readFileSync(path, "utf8").includes(ASKS)
    )

    expect(callers).toEqual([CALLS])
  })

  it("hands that lookup to attemptSignIn rather than making it itself", () => {
    const source = readFileSync(CALLS, "utf8")

    expect(source).toContain("attemptSignIn(")
    expect(source).toMatch(/attemptSignIn\([\s\S]*actorWithDigest\(/)
  })

  /**
   * The roster is gone, and a half-migrated portal would be one where it was
   * not: a module still *reading* `LOOM_PORTAL_REVIEWERS` would be a second way
   * in, configured rather than minted, and this suite's whole point is that
   * there is one way in.
   *
   * Reading it, not naming it. `config.ts` says in prose that the variable is
   * gone, which is the opposite of a second way in and should not fail a check
   * against one.
   */
  it("has no second way in left over from the roster", () => {
    const reads = /(?:process\.env\.LOOM_PORTAL_REVIEWERS|\[\s*["'`]LOOM_PORTAL_REVIEWERS["'`]\s*\]|LOOM_PORTAL_REVIEWERS\s*:)/

    const survivors = sources.filter((path) => reads.test(readFileSync(path, "utf8")))

    expect(survivors).toEqual([])
  })
})
