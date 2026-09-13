import { describe, expect, it } from "vitest"

import { ceilingOf, describeCeiling, withCeiling } from "./deadline.js"

/**
 * Real timers rather than fake ones, deliberately.
 *
 * What is under test is a race, and the two cases that matter are not close
 * calls: a promise that never settles against a 5ms ceiling, and a promise that
 * settles synchronously against a generous one. Both are decided by orders of
 * magnitude, so there is nothing for a scheduler to flip — and driving fake
 * timers through a race means the test asserts the harness's ordering rather
 * than the module's.
 */

const never = (): Promise<string> => new Promise<string>(() => undefined)

describe("ceilingOf", () => {
  it("falls back when the caller named nothing", () => {
    expect(ceilingOf(undefined, 10_000)).toBe(10_000)
  })

  it("falls back rather than passing a number setTimeout fires immediately on", () => {
    expect(ceilingOf(Number.NaN, 10_000)).toBe(10_000)
    expect(ceilingOf(Number.POSITIVE_INFINITY, 10_000)).toBe(10_000)
    expect(ceilingOf(0, 10_000)).toBe(10_000)
    expect(ceilingOf(-1, 10_000)).toBe(10_000)
  })

  it("takes a ceiling the caller did name", () => {
    expect(ceilingOf(250, 10_000)).toBe(250)
    expect(ceilingOf(1_200_000, 10_000)).toBe(1_200_000)
  })
})

describe("describeCeiling", () => {
  it("says a ceiling in the unit somebody would say it in", () => {
    expect(describeCeiling(250)).toBe("250ms")
    expect(describeCeiling(10_000)).toBe("10s")
    expect(describeCeiling(1_500)).toBe("1.5s")
    expect(describeCeiling(180_000)).toBe("3m")
  })

  it("does not round a ceiling into a different one", () => {
    expect(describeCeiling(90_000)).toBe("90s")
    expect(describeCeiling(1_234)).toBe("1.23s")
  })
})

describe("withCeiling", () => {
  it("answers with the attempt when it arrives first", async () => {
    const answer = await withCeiling(
      10_000,
      () => "gave up",
      async () => "answered"
    )

    expect(answer).toBe("answered")
  })

  it("answers with the expiry when the attempt never arrives", async () => {
    const answer = await withCeiling(5, () => "gave up", never)

    expect(answer).toBe("gave up")
  })

  it("aborts the attempt it walked away from, naming the ceiling", async () => {
    let reason: unknown

    const answer = await withCeiling(
      5,
      () => "gave up",
      (signal) =>
        new Promise<string>(() => {
          signal.addEventListener("abort", () => {
            reason = signal.reason
          })
        })
    )

    expect(answer).toBe("gave up")
    expect(reason).toBeInstanceOf(Error)
    expect((reason as Error).message).toBe("no answer in 5ms")
  })

  it("leaves the signal alone when the attempt answers in time", async () => {
    let aborted = false

    await withCeiling(
      10_000,
      () => "gave up",
      async (signal) => {
        signal.addEventListener("abort", () => {
          aborted = true
        })
        return "answered"
      }
    )

    expect(aborted).toBe(false)
  })

  /**
   * The failure this prevents is not a wrong answer, it is a process exit: a
   * rejection that arrives after the race has already been decided has nobody
   * left to catch it, and Node ends the server on an unhandled one.
   */
  it("does not leave a late rejection unhandled", async () => {
    const unhandled: unknown[] = []
    const onUnhandled = (reason: unknown): void => {
      unhandled.push(reason)
    }
    process.on("unhandledRejection", onUnhandled)

    try {
      const answer = await withCeiling(
        5,
        () => "gave up",
        () =>
          new Promise<string>((_resolve, reject) => {
            setTimeout(() => reject(new Error("too late")), 30)
          })
      )

      expect(answer).toBe("gave up")
      await new Promise((resolve) => setTimeout(resolve, 60))
      expect(unhandled).toEqual([])
    } finally {
      process.off("unhandledRejection", onUnhandled)
    }
  })

  it("hands a rejection that arrives in time back to the caller", async () => {
    await expect(
      withCeiling(10_000, () => "gave up", async () => {
        throw new Error("refused")
      })
    ).rejects.toThrow("refused")
  })
})
