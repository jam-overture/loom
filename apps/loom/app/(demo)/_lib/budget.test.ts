import { describe, expect, it } from "vitest"

import { fullBucket, spendToken, type BucketLimits } from "./budget"

const LIMITS: BucketLimits = { capacity: 3, refillMs: 1_000 }

describe("the model-call budget", () => {
  it("spends down to empty and then refuses", () => {
    const start = fullBucket(LIMITS, 0)

    const first = spendToken(start, LIMITS, 0)
    const second = spendToken(first.bucket, LIMITS, 0)
    const third = spendToken(second.bucket, LIMITS, 0)
    const fourth = spendToken(third.bucket, LIMITS, 0)

    expect([first, second, third].map((spend) => spend.allowed)).toEqual([true, true, true])
    expect(fourth.allowed).toBe(false)
    expect(fourth.bucket.tokens).toBe(0)
  })

  /** The point of a bucket rather than a counter: it comes back on its own. */
  it("earns a token back after the refill interval", () => {
    const empty = { tokens: 0, refilledAt: 0 }

    expect(spendToken(empty, LIMITS, 999).allowed).toBe(false)
    expect(spendToken(empty, LIMITS, 1_000).allowed).toBe(true)
  })

  it("never refills past capacity, however long it has been idle", () => {
    const empty = { tokens: 0, refilledAt: 0 }
    const afterAnHour = spendToken(empty, LIMITS, 3_600_000)

    expect(afterAnHour.allowed).toBe(true)
    expect(afterAnHour.bucket.tokens).toBe(LIMITS.capacity - 1)
  })

  /**
   * Partial progress towards the next token is kept rather than rounded away.
   * A bucket that reset its clock on every refill would let a caller spending
   * just under the interval hold the bucket empty forever.
   */
  it("carries the remainder of a partly elapsed interval", () => {
    const empty = { tokens: 0, refilledAt: 0 }
    const at1500 = spendToken(empty, LIMITS, 1_500)

    expect(at1500.bucket.refilledAt).toBe(1_000)
    expect(spendToken(at1500.bucket, LIMITS, 2_000).allowed).toBe(true)
  })

  it("does not run backwards when the clock does", () => {
    const start = fullBucket(LIMITS, 5_000)

    expect(spendToken(start, LIMITS, 1_000).bucket.tokens).toBe(LIMITS.capacity - 1)
  })
})
