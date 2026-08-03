import { describe, expect, it } from "vitest"

import {
  afterFailure,
  assess,
  DEFAULT_THROTTLE_POLICY,
  describeWait,
  forgetBefore,
  lockoutFor,
  type AttemptRecord,
  type ThrottlePolicy,
} from "./throttle"

const SECOND = 1000
const MINUTE = 60 * SECOND

/** Small round numbers, so an expected wait is readable rather than computed. */
const POLICY: ThrottlePolicy = {
  threshold: 3,
  windowMs: 10 * MINUTE,
  lockoutMs: MINUTE,
  maxLockoutMs: 4 * MINUTE,
}

const T0 = 1_700_000_000_000

const record = (failures: number, lastFailureAt: number): AttemptRecord => ({
  failures,
  firstFailureAt: T0,
  lastFailureAt,
})

/** Counts `count` failures in a row, each one millisecond after the last. */
const afterFailures = (count: number, policy = POLICY, at = T0): AttemptRecord => {
  const built = Array.from({ length: count }).reduce<AttemptRecord | null>(
    (carried, _, index) => afterFailure(carried, at + index, forgetBefore(at + index, policy)),
    null
  )

  if (built === null) throw new Error("afterFailures needs at least one failure")

  return built
}

describe("lockoutFor", () => {
  it("owes nothing below the threshold", () => {
    expect(lockoutFor(0, POLICY)).toBe(0)
    expect(lockoutFor(POLICY.threshold - 1, POLICY)).toBe(0)
  })

  it("charges the base wait for the failure that crosses it", () => {
    expect(lockoutFor(POLICY.threshold, POLICY)).toBe(MINUTE)
  })

  it("doubles for each failure after that, so waiting one out does not reset the price", () => {
    expect(lockoutFor(4, POLICY)).toBe(2 * MINUTE)
    expect(lockoutFor(5, POLICY)).toBe(4 * MINUTE)
  })

  it("stops doubling at the ceiling rather than growing without bound", () => {
    expect(lockoutFor(6, POLICY)).toBe(POLICY.maxLockoutMs)
    expect(lockoutFor(1_000, POLICY)).toBe(POLICY.maxLockoutMs)
  })
})

describe("assess", () => {
  it("allows a subject it has never seen", () => {
    expect(assess(null, T0, POLICY)).toEqual({ code: "allowed" })
  })

  it("allows a subject still under the threshold", () => {
    expect(assess(record(POLICY.threshold - 1, T0), T0, POLICY).code).toBe("allowed")
  })

  it("locks once the threshold is reached, and says how long is left", () => {
    const verdict = assess(record(POLICY.threshold, T0), T0 + 20 * SECOND, POLICY)

    expect(verdict).toEqual({
      code: "locked",
      until: T0 + MINUTE,
      retryAfterMs: 40 * SECOND,
    })
  })

  it("allows again the instant the lockout elapses", () => {
    expect(assess(record(POLICY.threshold, T0), T0 + MINUTE, POLICY).code).toBe("allowed")
  })

  /**
   * The record survives the lockout it imposed. Forgetting it there would make
   * every lockout the first one, which is the whole escalation gone.
   */
  it("keeps counting after a lockout elapses, so the next failure escalates", () => {
    const waited = T0 + MINUTE + SECOND
    const next = afterFailure(record(POLICY.threshold, T0), waited, forgetBefore(waited, POLICY))

    expect(next.failures).toBe(POLICY.threshold + 1)
    expect(assess(next, waited, POLICY)).toMatchObject({ retryAfterMs: 2 * MINUTE })
  })

  it("forgets a record older than the window, however many failures it holds", () => {
    const long = T0 + POLICY.windowMs + SECOND

    expect(assess(record(50, T0), long, POLICY).code).toBe("allowed")
  })

  /**
   * `forgetBefore` reaches back past the longest lockout as well as the window.
   * Without that, a policy whose ceiling exceeded its window would release a
   * lockout early by losing the record that imposed it — the throttle would get
   * *more* lenient the harder it was pushed.
   */
  it("does not forget a subject who is still serving a lockout longer than the window", () => {
    const stubborn: ThrottlePolicy = { ...POLICY, windowMs: MINUTE, maxLockoutMs: 30 * MINUTE }
    const held = assess(record(10, T0), T0 + 5 * MINUTE, stubborn)

    expect(held.code).toBe("locked")
  })
})

describe("afterFailure", () => {
  it("starts a record for a subject with none", () => {
    expect(afterFailure(null, T0, forgetBefore(T0, POLICY))).toEqual({
      failures: 1,
      firstFailureAt: T0,
      lastFailureAt: T0,
    })
  })

  it("counts up and keeps the first failure's time", () => {
    const second = afterFailure(record(1, T0), T0 + SECOND, forgetBefore(T0 + SECOND, POLICY))

    expect(second).toEqual({ failures: 2, firstFailureAt: T0, lastFailureAt: T0 + SECOND })
  })

  it("restarts from a record it no longer remembers", () => {
    const late = T0 + POLICY.windowMs + SECOND

    expect(afterFailure(record(9, T0), late, forgetBefore(late, POLICY))).toEqual({
      failures: 1,
      firstFailureAt: late,
      lastFailureAt: late,
    })
  })

  it("takes the threshold's worth of failures to lock, and not one fewer", () => {
    expect(assess(afterFailures(POLICY.threshold - 1), T0, POLICY).code).toBe("allowed")
    expect(assess(afterFailures(POLICY.threshold), T0, POLICY).code).toBe("locked")
  })
})

describe("the shipped policy", () => {
  it("tolerates a handful of mistakes before it costs anyone anything", () => {
    expect(assess(afterFailures(4, DEFAULT_THROTTLE_POLICY), T0, DEFAULT_THROTTLE_POLICY).code).toBe(
      "allowed"
    )
  })

  /**
   * The number the record is defended on: an attacker who waits out every
   * lockout perfectly gets tens of guesses a day, not thousands.
   */
  it("settles at a wait that caps a patient attacker near a hundred guesses a day", () => {
    const guessesPerDay = (24 * 60 * MINUTE) / lockoutFor(1_000, DEFAULT_THROTTLE_POLICY)

    expect(guessesPerDay).toBeLessThanOrEqual(100)
  })
})

describe("describeWait", () => {
  it("rounds up, so a reported wait is never already over", () => {
    expect(describeWait(1_500)).toBe("2 seconds")
    expect(describeWait(61 * SECOND)).toBe("2 minutes")
  })

  it("never says zero", () => {
    expect(describeWait(0)).toBe("1 second")
  })

  it("agrees with itself about plurals", () => {
    expect(describeWait(SECOND)).toBe("1 second")
    expect(describeWait(MINUTE)).toBe("1 minute")
  })
})
