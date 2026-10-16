import { describe, expect, it } from "vitest"

import { describeAuthProblem, MINIMUM_SECRET_LENGTH, resolveAuthConfig } from "./config"

const SECRET = "s".repeat(MINIMUM_SECRET_LENGTH)

describe("resolveAuthConfig", () => {
  it("resolves the one variable it still reads", () => {
    const resolved = resolveAuthConfig({ LOOM_PORTAL_SESSION_SECRET: SECRET })

    expect(resolved.ok && resolved.value).toEqual({ secret: SECRET })
  })

  /**
   * The decision worth a test rather than a comment: everywhere else in this
   * portal absent configuration degrades, and here it fails closed (0027). An
   * open portal looks exactly like a working one.
   */
  it("fails closed when nothing is configured, rather than admitting everyone", () => {
    const resolved = resolveAuthConfig({})

    expect(resolved.ok).toBe(false)
    expect(!resolved.ok && resolved.error.code).toBe("no-secret")
  })

  it("refuses a secret short enough to guess", () => {
    const resolved = resolveAuthConfig({
      LOOM_PORTAL_SESSION_SECRET: "s".repeat(MINIMUM_SECRET_LENGTH - 1),
    })

    expect(!resolved.ok && resolved.error.code).toBe("no-secret")
  })

  /**
   * What 0285 removed, held so it stays removed. Who may sign in is a table,
   * and a deployment that still has the old variable set must not be able to
   * get anybody in with it — a half-migrated portal where configuration still
   * worked would be the roster surviving its own deletion.
   */
  it("reads nothing from the roster variable it replaced", () => {
    const resolved = resolveAuthConfig({
      LOOM_PORTAL_SESSION_SECRET: SECRET,
      LOOM_PORTAL_REVIEWERS: `ana:${"k".repeat(32)}`,
    })

    expect(resolved.ok && resolved.value).toEqual({ secret: SECRET })
  })

  it("ignores whitespace around a secret pasted from a terminal", () => {
    const resolved = resolveAuthConfig({ LOOM_PORTAL_SESSION_SECRET: `  ${SECRET}\n` })

    expect(resolved.ok && resolved.value.secret).toBe(SECRET)
  })
})

describe("describeAuthProblem", () => {
  it("names the variable and how to produce a value for it", () => {
    const detail = describeAuthProblem({ code: "no-secret" })

    expect(detail).toContain("LOOM_PORTAL_SESSION_SECRET")
    expect(detail).toContain("openssl rand -hex 32")
  })
})
