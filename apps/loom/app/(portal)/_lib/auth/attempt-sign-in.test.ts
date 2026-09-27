import { describe, expect, it, vi } from "vitest"

import { err, type Result } from "@jam-overture/loom"

import { attemptSignIn } from "./attempt-sign-in"
import { memoryAttemptLog, type AttemptLog, type AttemptLogError } from "./attempts"
import { DEFAULT_THROTTLE_POLICY, type ThrottlePolicy } from "./throttle"

const MINUTE = 60 * 1000

const POLICY: ThrottlePolicy = {
  threshold: 3,
  windowMs: 10 * MINUTE,
  lockoutMs: MINUTE,
  maxLockoutMs: 4 * MINUTE,
}

const T0 = 1_700_000_000_000

const SUBJECT = "a-subject"

/** An `AttemptLog` that fails everything, to prove the caller refuses rather than proceeds. */
const brokenAttemptLog = (): AttemptLog => {
  const failure = async (): Promise<Result<never, AttemptLogError>> =>
    err({ code: "unavailable", detail: "the log is down" })

  return { recall: failure, penalise: failure, forgive: failure, survey: failure }
}

const wrongKey = () => null
const rightKey = () => "ana"

/** Fails `count` times in a row, one millisecond apart, against a fresh log. */
const exhaust = async (log: AttemptLog, count: number, at = T0): Promise<void> => {
  for (const index of Array.from({ length: count }, (_, position) => position)) {
    await attemptSignIn(log, POLICY, { subject: SUBJECT, now: at + index }, wrongKey)
  }
}

describe("attemptSignIn", () => {
  it("accepts a key the roster recognises", async () => {
    const outcome = await attemptSignIn(
      memoryAttemptLog(),
      POLICY,
      { subject: SUBJECT, now: T0 },
      rightKey
    )

    expect(outcome).toEqual({ code: "accepted", actor: "ana" })
  })

  it("rejects one that it does not, without saying anything else", async () => {
    const outcome = await attemptSignIn(
      memoryAttemptLog(),
      POLICY,
      { subject: SUBJECT, now: T0 },
      wrongKey
    )

    expect(outcome).toEqual({ code: "rejected" })
  })

  it("locks on the failure that crosses the threshold, rather than the one after it", async () => {
    const log = memoryAttemptLog()
    await exhaust(log, POLICY.threshold - 1)

    const crossing = await attemptSignIn(
      log,
      POLICY,
      { subject: SUBJECT, now: T0 + POLICY.threshold },
      wrongKey
    )

    expect(crossing.code).toBe("locked")
  })

  /**
   * The property the order of operations exists for. A locked-out caller must
   * not reach the comparison at all: if they did, a lockout would cost them time
   * and leave the oracle they came for intact.
   */
  it("never compares a key while the subject is locked out", async () => {
    const log = memoryAttemptLog()
    await exhaust(log, POLICY.threshold)

    const verify = vi.fn(rightKey)
    const outcome = await attemptSignIn(
      log,
      POLICY,
      { subject: SUBJECT, now: T0 + POLICY.threshold },
      verify
    )

    expect(outcome.code).toBe("locked")
    expect(verify).not.toHaveBeenCalled()
  })

  it("refuses a correct key during a lockout, which is the cost of having one", async () => {
    const log = memoryAttemptLog()
    await exhaust(log, POLICY.threshold)

    const outcome = await attemptSignIn(
      log,
      POLICY,
      { subject: SUBJECT, now: T0 + 1_000 },
      rightKey
    )

    expect(outcome.code).toBe("locked")
  })

  it("says how long is left rather than only that there is a wait", async () => {
    const log = memoryAttemptLog()
    await exhaust(log, POLICY.threshold)

    const outcome = await attemptSignIn(
      log,
      POLICY,
      { subject: SUBJECT, now: T0 + 20_000 },
      wrongKey
    )

    expect(outcome).toMatchObject({ code: "locked", retryAfterMs: MINUTE - 20_000 + 2 })
  })

  it("lets the subject back in once the lockout elapses", async () => {
    const log = memoryAttemptLog()
    await exhaust(log, POLICY.threshold)

    const outcome = await attemptSignIn(
      log,
      POLICY,
      { subject: SUBJECT, now: T0 + POLICY.lockoutMs + 1_000 },
      rightKey
    )

    expect(outcome).toEqual({ code: "accepted", actor: "ana" })
  })

  it("counts one subject's failures against nobody else", async () => {
    const log = memoryAttemptLog()
    await exhaust(log, POLICY.threshold)

    const other = await attemptSignIn(log, POLICY, { subject: "elsewhere", now: T0 }, rightKey)

    expect(other.code).toBe("accepted")
  })

  /**
   * A correct key clears the count. Without this, a reviewer who mistyped three
   * times and then got it right would be locked out by their next mistake a week
   * later.
   */
  it("forgets a subject's failures once they present a key that works", async () => {
    const log = memoryAttemptLog()
    await exhaust(log, POLICY.threshold - 1)
    await attemptSignIn(log, POLICY, { subject: SUBJECT, now: T0 + 100 }, rightKey)

    const later = await attemptSignIn(log, POLICY, { subject: SUBJECT, now: T0 + 200 }, wrongKey)

    expect(later).toEqual({ code: "rejected" })
  })

  describe("when the log cannot answer", () => {
    /**
     * 0034. A throttle that cannot count is not a throttle, and the state it
     * degrades to would be an unlimited guessing endpoint that looks exactly
     * like a working portal.
     */
    it("refuses the attempt rather than proceeding uncounted", async () => {
      const outcome = await attemptSignIn(
        brokenAttemptLog(),
        DEFAULT_THROTTLE_POLICY,
        { subject: SUBJECT, now: T0 },
        rightKey
      )

      expect(outcome).toEqual({ code: "unavailable", detail: "the log is down" })
    })

    it("does not compare the key first", async () => {
      const verify = vi.fn(rightKey)
      await attemptSignIn(
        brokenAttemptLog(),
        DEFAULT_THROTTLE_POLICY,
        { subject: SUBJECT, now: T0 },
        verify
      )

      expect(verify).not.toHaveBeenCalled()
    })

    it("refuses when the failure cannot be recorded, having read the record fine", async () => {
      const log: AttemptLog = {
        ...memoryAttemptLog(),
        penalise: async () => err({ code: "unavailable", detail: "the write failed" }),
      }

      const outcome = await attemptSignIn(log, POLICY, { subject: SUBJECT, now: T0 }, wrongKey)

      expect(outcome.code).toBe("unavailable")
    })

    /**
     * The one failure that is not the caller's problem: the key was right, and a
     * row that could not be deleted expires on its own.
     */
    it("still signs in a valid key when only the forgetting failed", async () => {
      const log: AttemptLog = {
        ...memoryAttemptLog(),
        forgive: async () => err({ code: "unavailable", detail: "the delete failed" }),
      }

      const outcome = await attemptSignIn(log, POLICY, { subject: SUBJECT, now: T0 }, rightKey)

      expect(outcome).toEqual({ code: "accepted", actor: "ana" })
    })
  })
})
