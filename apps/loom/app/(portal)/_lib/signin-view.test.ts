import { describe, expect, it } from "vitest"

import type { AuthResult } from "./auth/config"
import type { SignInPressure } from "./auth/pressure"
import { DEFAULT_THROTTLE_POLICY } from "./auth/throttle"
import {
  authReadout,
  describeLocked,
  describePolicy,
  describePressure,
  describeSince,
  toneOfPressure,
} from "./signin-view"

const NOW = 1_700_000_000_000

const MINUTE = 60 * 1000

const pressure = (overrides: Partial<SignInPressure> = {}): SignInPressure => ({
  subjects: 0,
  failures: 0,
  locked: 0,
  lockedIsExact: true,
  longestWaitMs: 0,
  earliestFailureAt: null,
  latestFailureAt: null,
  counted: 0,
  ...overrides,
})

describe("describeSince", () => {
  it("does not put a number on something that just happened", () => {
    expect(describeSince(59_000)).toBe("less than a minute ago")
  })

  it("rounds down, so a burst never reads as older than it is", () => {
    expect(describeSince(119_000)).toBe("1 minute ago")
  })

  it("counts in minutes below an hour and hours above it", () => {
    expect(describeSince(59 * MINUTE)).toBe("59 minutes ago")
    expect(describeSince(60 * MINUTE)).toBe("1 hour ago")
    expect(describeSince(5 * 60 * MINUTE)).toBe("5 hours ago")
  })
})

describe("describeLocked", () => {
  it("gives a plain number when the survey saw everything", () => {
    expect(describeLocked(pressure({ locked: 2, lockedIsExact: true }))).toBe("2")
  })

  it("says so when the number is a floor", () => {
    expect(describeLocked(pressure({ locked: 2, lockedIsExact: false }))).toBe("at least 2")
  })
})

describe("describePressure", () => {
  it("reads an empty log as quiet, and says why that is not merely 'no data'", () => {
    const reading = describePressure(pressure(), NOW)

    expect(reading.tone).toBe("quiet")
    expect(reading.headline).toBe("Nothing is being counted against anyone.")
    expect(reading.detail).toContain("starts from zero")
  })

  it("reads failures with nobody locked as counting", () => {
    const reading = describePressure(
      pressure({ subjects: 2, failures: 3, counted: 2, latestFailureAt: NOW - 4 * MINUTE }),
      NOW
    )

    expect(reading.tone).toBe("counting")
    expect(reading.headline).toBe("2 callers have failed recently. None is locked out.")
    expect(reading.detail).toContain("4 minutes ago")
  })

  it("reads a lockout as locking, and names the longest wait", () => {
    const reading = describePressure(
      pressure({
        subjects: 3,
        failures: 17,
        locked: 2,
        counted: 3,
        longestWaitMs: 7 * MINUTE,
        latestFailureAt: NOW - 30_000,
      }),
      NOW
    )

    expect(reading.tone).toBe("locking")
    expect(reading.headline).toBe("2 of 3 callers are locked out right now.")
    expect(reading.detail).toContain("7 minutes")
  })

  it("carries the floor into the headline rather than stating it as a total", () => {
    const reading = describePressure(
      pressure({ subjects: 600, failures: 900, locked: 500, lockedIsExact: false, counted: 500 }),
      NOW
    )

    expect(reading.headline).toContain("at least 500")
  })

  it("says 'caller' and 'is' for one, and does not for two", () => {
    expect(describePressure(pressure({ subjects: 1, failures: 1, counted: 1 }), NOW).headline).toBe(
      "1 caller has failed recently. None is locked out."
    )
    expect(
      describePressure(pressure({ subjects: 2, failures: 2, locked: 1, counted: 2 }), NOW).headline
    ).toBe("1 of 2 callers is locked out right now.")
  })

  /** A log with counts but no timestamp is not a state anything produces — it must still read. */
  it("leaves the recency clause out when there is no last failure to date", () => {
    const reading = describePressure(pressure({ subjects: 1, failures: 1, counted: 1 }), NOW)

    expect(reading.detail).not.toContain("most recent")
  })

  it("maps each state onto a distinct tone", () => {
    const tones = (["quiet", "counting", "locking"] as const).map(toneOfPressure)

    expect(new Set(tones).size).toBe(3)
  })
})

describe("describePolicy", () => {
  it("states the numbers a reader would otherwise have to find in the source", () => {
    const described = describePolicy(DEFAULT_THROTTLE_POLICY)

    expect(described).toContain("5 failures")
    expect(described).toContain("60 minutes")
    expect(described).toContain("1 minute")
    expect(described).toContain("15 minutes")
  })
})

/**
 * The visitor and the operator do not read the same sentence, and until this
 * function existed the page rendered the operator's one at both of them. What
 * the test is really pinning is the *split*: a headline that names no variable,
 * and a `technical` field that carries the operator's message unaltered.
 */
describe("authReadout", () => {
  const okAuth: AuthResult = { ok: true, value: { secret: "x".repeat(32), reviewers: [] } }

  it("passes an ok config through as ok — nothing to show, nothing to explain", () => {
    expect(authReadout(okAuth)).toEqual({ ok: true })
  })

  it("leads a missing-secret with a plain sentence and keeps the operator's message word for word", () => {
    const readout = authReadout({ ok: false, error: { code: "no-secret" } })

    expect(readout.ok).toBe(false)
    if (readout.ok) return

    expect(readout.headline).toBe("This portal isn't set up yet.")
    expect(readout.headline).not.toContain("LOOM_PORTAL")
    expect(readout.detail).toContain("live demo")
    /*
     * The exact bytes `describeAuthProblem` returns — this is the disclosure
     * the plain-language rule guarantees: nothing is removed, only moved.
     */
    expect(readout.technical).toContain("LOOM_PORTAL_SESSION_SECRET")
    expect(readout.technical).toContain("openssl rand -hex 32")
  })

  it("leads a malformed roster the same way, with the roster problem behind the disclosure", () => {
    const readout = authReadout({
      ok: false,
      error: { code: "bad-roster", problem: { code: "malformed-entry", entry: "no-colon" } },
    })

    expect(readout.ok).toBe(false)
    if (readout.ok) return

    /* A visitor's next move is identical to the missing-secret case, so the
     * headline is identical. The rule that is really being enforced is: the
     * visitor's sentence does not depend on which variable is wrong. */
    expect(readout.headline).toBe("This portal isn't set up yet.")
    expect(readout.technical).toContain("no-colon")
  })
})
