import { describe, expect, it } from "vitest"

import { describeAuthProblem, MINIMUM_SECRET_LENGTH, resolveAuthConfig } from "./config"
import { MINIMUM_KEY_LENGTH } from "./roster"

const SECRET = "s".repeat(MINIMUM_SECRET_LENGTH)
const KEY = "k".repeat(MINIMUM_KEY_LENGTH)

describe("resolveAuthConfig", () => {
  it("resolves a secret and a roster", () => {
    const resolved = resolveAuthConfig({
      LOOM_PORTAL_SESSION_SECRET: SECRET,
      LOOM_PORTAL_REVIEWERS: `ana:${KEY}`,
    })

    expect(resolved.ok && resolved.value).toEqual({
      secret: SECRET,
      reviewers: [{ actor: "ana", key: KEY }],
    })
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
      LOOM_PORTAL_REVIEWERS: `ana:${KEY}`,
    })

    expect(!resolved.ok && resolved.error.code).toBe("no-secret")
  })

  it("refuses a secret configured with a secret and no reviewers", () => {
    const resolved = resolveAuthConfig({ LOOM_PORTAL_SESSION_SECRET: SECRET })

    expect(!resolved.ok && resolved.error.code).toBe("bad-roster")
  })

  it("carries the roster's own problem through rather than flattening it", () => {
    const resolved = resolveAuthConfig({
      LOOM_PORTAL_SESSION_SECRET: SECRET,
      LOOM_PORTAL_REVIEWERS: "ana:short",
    })

    expect(!resolved.ok && resolved.error).toEqual({
      code: "bad-roster",
      problem: { code: "weak-key", actor: "ana" },
    })
  })

  it("ignores whitespace around a secret pasted from a terminal", () => {
    const resolved = resolveAuthConfig({
      LOOM_PORTAL_SESSION_SECRET: `  ${SECRET}\n`,
      LOOM_PORTAL_REVIEWERS: `ana:${KEY}`,
    })

    expect(resolved.ok && resolved.value.secret).toBe(SECRET)
  })
})

describe("describeAuthProblem", () => {
  it("names the variable and how to produce a value for it", () => {
    const detail = describeAuthProblem({ code: "no-secret" })

    expect(detail).toContain("LOOM_PORTAL_SESSION_SECRET")
    expect(detail).toContain("openssl rand -hex 32")
  })

  it("defers to the roster's own message", () => {
    expect(describeAuthProblem({ code: "bad-roster", problem: { code: "no-entries" } })).toContain(
      "LOOM_PORTAL_REVIEWERS"
    )
  })
})
