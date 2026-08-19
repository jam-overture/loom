import { describe, expect, it } from "vitest"

import type { AttemptSurvey } from "./attempts"
import { readPressure } from "./pressure"
import { DEFAULT_THROTTLE_POLICY, type AttemptRecord, type ThrottlePolicy } from "./throttle"

const NOW = 1_700_000_000_000

const POLICY: ThrottlePolicy = DEFAULT_THROTTLE_POLICY

/** A record with `failures` failures, the last of them `agoMs` ago. */
const record = (failures: number, agoMs: number): AttemptRecord => ({
  failures,
  firstFailureAt: NOW - agoMs - 1_000,
  lastFailureAt: NOW - agoMs,
})

const survey = (
  records: readonly AttemptRecord[],
  overrides: Partial<AttemptSurvey> = {}
): AttemptSurvey => ({
  subjects: records.length,
  failures: records.reduce((total, one) => total + one.failures, 0),
  earliestFailureAt: records.length === 0 ? null : Math.min(...records.map((r) => r.firstFailureAt)),
  latestFailureAt: records.length === 0 ? null : Math.max(...records.map((r) => r.lastFailureAt)),
  records,
  ...overrides,
})

describe("readPressure", () => {
  it("reports an empty log as nothing at all, with no dates invented", () => {
    expect(readPressure(survey([]), NOW, POLICY)).toEqual({
      subjects: 0,
      failures: 0,
      locked: 0,
      lockedIsExact: true,
      longestWaitMs: 0,
      earliestFailureAt: null,
      latestFailureAt: null,
      counted: 0,
    })
  })

  it("carries the survey's totals through rather than recomputing them from the sample", () => {
    const capped = survey([record(1, 0)], { subjects: 40, failures: 90 })

    const pressure = readPressure(capped, NOW, POLICY)

    expect(pressure.subjects).toBe(40)
    expect(pressure.failures).toBe(90)
    expect(pressure.counted).toBe(1)
  })

  it("counts nobody as locked while every caller is under the threshold", () => {
    const pressure = readPressure(survey([record(4, 0), record(1, 5_000)]), NOW, POLICY)

    expect(pressure.locked).toBe(0)
    expect(pressure.longestWaitMs).toBe(0)
  })

  it("counts a caller who has crossed the threshold and is still waiting", () => {
    const pressure = readPressure(survey([record(5, 10_000)]), NOW, POLICY)

    expect(pressure.locked).toBe(1)
    expect(pressure.longestWaitMs).toBe(POLICY.lockoutMs - 10_000)
  })

  /** The same judgement the sign-in path makes: a served-out lockout is not a lockout. */
  it("does not count a caller whose wait has elapsed", () => {
    const pressure = readPressure(survey([record(5, POLICY.lockoutMs + 1)]), NOW, POLICY)

    expect(pressure.locked).toBe(0)
  })

  it("reports the longest wait, not the first or the last one it saw", () => {
    const pressure = readPressure(
      survey([record(5, 30_000), record(7, 30_000), record(5, 0)]),
      NOW,
      POLICY
    )

    expect(pressure.locked).toBe(3)
    expect(pressure.longestWaitMs).toBe(POLICY.lockoutMs * 4 - 30_000)
  })

  describe("when the survey was capped", () => {
    it("is exact when nothing was dropped", () => {
      expect(readPressure(survey([record(5, 0)]), NOW, POLICY).lockedIsExact).toBe(true)
    })

    /**
     * The dropped rows are the oldest, and a row older than the longest possible
     * lockout cannot be serving one — so a cap that reached back past that
     * horizon has hidden nothing, and the number stays a number.
     */
    it("is exact when the oldest record it saw is already past the lockout horizon", () => {
      const capped = survey([record(5, 0), record(1, POLICY.maxLockoutMs + 1)], { subjects: 99 })

      expect(readPressure(capped, NOW, POLICY).lockedIsExact).toBe(true)
    })

    it("is a floor when the dropped rows could still be serving a lockout", () => {
      const capped = survey([record(5, 0), record(5, 1_000)], { subjects: 99 })

      const pressure = readPressure(capped, NOW, POLICY)

      expect(pressure.lockedIsExact).toBe(false)
      expect(pressure.locked).toBe(2)
    })

    /** A survey that reported subjects and returned no rows tells us nothing about lockouts. */
    it("is a floor when the totals say there are subjects and no record came back", () => {
      expect(readPressure(survey([], { subjects: 3 }), NOW, POLICY).lockedIsExact).toBe(false)
    })
  })
})
