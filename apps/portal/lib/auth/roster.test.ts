import { describe, expect, it } from "vitest"

import {
  authenticate,
  describeRosterProblem,
  MINIMUM_KEY_LENGTH,
  parseRoster,
  type Reviewer,
} from "./roster"

const KEY_A = "a".repeat(MINIMUM_KEY_LENGTH)
const KEY_B = "b".repeat(MINIMUM_KEY_LENGTH)

describe("parseRoster", () => {
  it("reads one reviewer", () => {
    expect(parseRoster(`ana:${KEY_A}`)).toEqual({ ok: true, value: [{ actor: "ana", key: KEY_A }] })
  })

  it("reads several, separated by commas or newlines, ignoring the whitespace around them", () => {
    const parsed = parseRoster(`  ana:${KEY_A} ,\n  bo:${KEY_B}\n`)

    expect(parsed.ok && parsed.value.map((reviewer) => reviewer.actor)).toEqual(["ana", "bo"])
  })

  /** A host will reach for an email before it reaches for a handle. */
  it("accepts an email address as an actor id", () => {
    const parsed = parseRoster(`ana+review@example.com:${KEY_A}`)

    expect(parsed.ok && parsed.value[0]?.actor).toBe("ana+review@example.com")
  })

  /** The key may hold anything base64 does; only the first colon separates. */
  it("keeps a key that contains colons", () => {
    const key = `${KEY_A}:with:colons`
    const parsed = parseRoster(`ana:${key}`)

    expect(parsed.ok && parsed.value[0]?.key).toBe(key)
  })

  it("refuses an empty roster rather than returning nobody", () => {
    expect(parseRoster(undefined)).toEqual({ ok: false, error: { code: "no-entries" } })
    expect(parseRoster("   ")).toEqual({ ok: false, error: { code: "no-entries" } })
  })

  it("refuses an entry that is not actor:key", () => {
    expect(parseRoster(KEY_A)).toEqual({ ok: false, error: { code: "malformed-entry", entry: KEY_A } })
    expect(parseRoster(`:${KEY_A}`)).toEqual({
      ok: false,
      error: { code: "malformed-entry", entry: `:${KEY_A}` },
    })
  })

  it("refuses an actor id that would not survive being displayed", () => {
    expect(parseRoster(`an a:${KEY_A}`)).toEqual({
      ok: false,
      error: { code: "invalid-actor", actor: "an a" },
    })
    expect(parseRoster(`<b>:${KEY_A}`).ok).toBe(false)
  })

  /**
   * The key is the entire credential — no second factor, no rate limit — so a
   * short one is a mistake to name at startup rather than a weakness to run on.
   */
  it("refuses a key shorter than the minimum", () => {
    expect(parseRoster("ana:short")).toEqual({ ok: false, error: { code: "weak-key", actor: "ana" } })
    expect(parseRoster(`ana:${"a".repeat(MINIMUM_KEY_LENGTH - 1)}`).ok).toBe(false)
  })

  /** Two entries for one name means one of them silently never authenticates. */
  it("refuses the same actor twice", () => {
    expect(parseRoster(`ana:${KEY_A},ana:${KEY_B}`)).toEqual({
      ok: false,
      error: { code: "duplicate-actor", actor: "ana" },
    })
  })
})

describe("authenticate", () => {
  const reviewers: readonly Reviewer[] = [
    { actor: "ana", key: KEY_A },
    { actor: "bo", key: KEY_B },
  ]

  it("says who presented the key", () => {
    expect(authenticate(reviewers, KEY_A)).toBe("ana")
    expect(authenticate(reviewers, KEY_B)).toBe("bo")
  })

  it("says nobody for a key on no entry", () => {
    expect(authenticate(reviewers, "c".repeat(MINIMUM_KEY_LENGTH))).toBeNull()
    expect(authenticate(reviewers, "")).toBeNull()
    expect(authenticate([], KEY_A)).toBeNull()
  })

  /** A prefix of a valid key is not a valid key, however long the prefix. */
  it("does not match a truncated key", () => {
    expect(authenticate(reviewers, KEY_A.slice(0, -1))).toBeNull()
  })
})

describe("describeRosterProblem", () => {
  it("names the variable and the entry, so an operator can find it", () => {
    expect(describeRosterProblem({ code: "no-entries" })).toContain("LOOM_PORTAL_REVIEWERS")
    expect(describeRosterProblem({ code: "malformed-entry", entry: "oops" })).toContain("oops")
    expect(describeRosterProblem({ code: "weak-key", actor: "ana" })).toContain("ana")
    expect(describeRosterProblem({ code: "duplicate-actor", actor: "ana" })).toContain("twice")
    expect(describeRosterProblem({ code: "invalid-actor", actor: "an a" })).toContain("an a")
  })
})
