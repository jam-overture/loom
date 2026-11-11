import { describe, expect, it } from "vitest"

import type { ExpiryOutcome, ExpiryStop } from "./expire.js"
import { collectionNoticeOf, type DeliveryRetention } from "./notice.js"
import { describeRetentionPromise, retentionPromiseOf } from "./retention.js"

const MINUTE = 60 * 1000

/**
 * The retention a deployment publishes, built through the notice rather than by
 * hand.
 *
 * The whole point of the reading is that the ceiling it judges against is the
 * one a reader is shown, so a fixture that spelled `goneWithinMs` itself would
 * be testing a second derivation and could not catch the two drifting apart.
 */
const retention = (keptMs: number, everyMs?: number): DeliveryRetention => {
  const { bufferMs, keptMs: kept, sweep } = collectionNoticeOf({
    windowMs: COUNTS,
    keptMs,
    ...(everyMs === undefined ? {} : { sweep: { everyMs } }),
  })

  return { bufferMs, keptMs: kept, sweep }
}

/**
 * Four deliberately different lengths, because every way this reading could be
 * wrong is an addition with one term counted twice or the wrong window read.
 *
 * Five minutes to be counted, fifteen minutes kept, a five-minute cron, fifty
 * minutes in the table: a ceiling of twenty and a gap of thirty. Reading the
 * collection window instead of the kept one gives a ceiling of ten; summing the
 * two windows rather than taking the later gives twenty-five; doubling the
 * ceiling gives ten and dropping the sweep gives thirty-five — five plausible
 * minute figures and no two of them equal.
 */
const COUNTS = 5 * MINUTE
const KEPT = 15 * MINUTE
const SWEEPS = 5 * MINUTE
const CEILING = 20 * MINUTE
const OLDEST = 50 * MINUTE
const PAST = 30 * MINUTE

const expired = (oldestMs: number, stopped: ExpiryStop = "young"): ExpiryOutcome => ({
  outcome: "expired",
  removed: 3,
  oldestMs,
  stopped,
  more: false,
})

describe("retentionPromiseOf", () => {
  it("names the gap when the oldest delivery outlived the ceiling readers are promised", () => {
    expect(retentionPromiseOf(expired(OLDEST), retention(KEPT, SWEEPS))).toEqual({
      state: "broken",
      oldestMs: OLDEST,
      goneWithinMs: CEILING,
      byMs: PAST,
      uncounted: false,
    })
  })

  /**
   * The ceiling is the later of the two windows plus one sweep, so a delivery
   * exactly on it is a sweep that ran on time and not one that is late. The
   * boundary is tested from both sides because a deployment sweeping on the
   * interval it stated sits on it: a reading that faulted at the boundary would
   * cry wolf on every healthy run, which is the one way it could be made
   * useless.
   */
  it("keeps the promise at the ceiling and breaks it one millisecond past", () => {
    expect(retentionPromiseOf(expired(CEILING), retention(KEPT, SWEEPS))).toMatchObject({
      state: "kept",
      oldestMs: CEILING,
    })
    expect(retentionPromiseOf(expired(CEILING + 1), retention(KEPT, SWEEPS))).toMatchObject({
      state: "broken",
      byMs: 1,
    })
  })

  /**
   * The ceiling is taken off the kept window and not the collection window
   * (0351), which is the one substitution that would read *kept* on a
   * deployment keeping deliveries three times longer than it says.
   */
  it("judges against the window a delivery is deleted at, not the one it is counted at", () => {
    expect(retentionPromiseOf(expired(12 * MINUTE), retention(KEPT, SWEEPS))).toMatchObject({
      state: "kept",
      goneWithinMs: CEILING,
    })
  })

  /**
   * Where the kept window is the shorter of the two, a delivery still has to be
   * counted before anything may delete it, so the ceiling is the collection
   * window plus a sweep rather than the shorter promise.
   */
  it("takes the later of the two windows where the kept one is shorter", () => {
    expect(retentionPromiseOf(expired(MINUTE), retention(MINUTE, SWEEPS))).toMatchObject({
      state: "kept",
      goneWithinMs: COUNTS + SWEEPS,
    })
  })

  it("carries both figures when the promise is being kept, because the sentence is the comparison", () => {
    expect(retentionPromiseOf(expired(16 * MINUTE), retention(KEPT, SWEEPS))).toEqual({
      state: "kept",
      oldestMs: 16 * MINUTE,
      goneWithinMs: CEILING,
    })
  })

  /**
   * A table months behind is still a deployment that promised nothing, so
   * there is no claim of its own to hold it to. The remedy is a stated
   * interval, and the operator hears about that from the setting.
   */
  it("judges nothing where the deployment stated no interval, however old the table is", () => {
    expect(retentionPromiseOf(expired(40 * 24 * 60 * MINUTE), retention(KEPT))).toEqual({
      state: "unpromised",
    })
  })

  /**
   * Nothing expirable is the one quiet answer that is a proof: the scan runs
   * from the oldest end, so every delivery is younger than the kept window, and
   * the ceiling is that window plus a sweep.
   */
  it("reads a run that found nothing old enough as nothing being past the ceiling", () => {
    expect(
      retentionPromiseOf(
        { outcome: "nothing-expired", waiting: 4, oldestMs: MINUTE, stopped: "young" },
        retention(KEPT, SWEEPS)
      )
    ).toEqual({ state: "kept", oldestMs: MINUTE, goneWithinMs: CEILING })
  })

  /**
   * A run that read no row at all saw no delivery, which is a table with
   * nothing in it. It is the same answer a young oldest row gives and for a
   * stronger reason, so it is `unripe` rather than a figure of nought — which
   * would say *a delivery that arrived this instant*.
   */
  it("reads a table with nothing in it as nothing being past the ceiling", () => {
    expect(
      retentionPromiseOf(
        { outcome: "nothing-expired", waiting: 0, oldestMs: null, stopped: "end" },
        retention(KEPT, SWEEPS)
      )
    ).toEqual({ state: "unripe" })
  })

  it("says nothing about a run that never reached the table", () => {
    const configured = retention(KEPT, SWEEPS)

    expect(
      retentionPromiseOf({ outcome: "refused", reason: 'the clock read "later"' }, configured)
    ).toEqual({ state: "unread" })
    expect(
      retentionPromiseOf(
        { outcome: "unavailable", error: { code: "unavailable", detail: "gone" } },
        configured
      )
    ).toEqual({ state: "unread" })
  })

  /**
   * The age reaches here already subtracted, so the one way it can arrive
   * unusable is a stored instant that would not parse. Answering `kept` on it
   * would be the reading's single worst failure — a false *all is well* over a
   * table nothing could measure.
   */
  it("says nothing where the age is not a number, rather than keeping the promise", () => {
    expect(retentionPromiseOf(expired(Number.NaN), retention(KEPT, SWEEPS))).toEqual({
      state: "unread",
    })
  })

  /**
   * A delivery stamped in the future is a clock disagreeing with itself, and it
   * answers by the same subtraction rather than by a special case: a negative
   * age is never longer than a positive ceiling (0274).
   */
  it("keeps the promise on a delivery received in the future", () => {
    expect(retentionPromiseOf(expired(-MINUTE), retention(KEPT, SWEEPS))).toMatchObject({
      state: "kept",
      oldestMs: -MINUTE,
    })
  })

  /**
   * The gap is real whichever sweep is at fault, and the one case where the
   * remedy is not the expiry run's is named rather than softened: nothing may
   * delete a delivery no fold has counted, so a deployment whose collection has
   * stopped breaks this promise by not counting (0351).
   */
  it("says when the oldest delivery is held by a fold that has not run", () => {
    expect(
      retentionPromiseOf(
        {
          outcome: "nothing-expired",
          waiting: 9,
          oldestMs: OLDEST,
          stopped: "uncounted",
        },
        retention(KEPT, SWEEPS)
      )
    ).toEqual({
      state: "broken",
      oldestMs: OLDEST,
      goneWithinMs: CEILING,
      byMs: PAST,
      uncounted: true,
    })
  })

  /** One configuration, one answer, however often it is asked. */
  it("answers the same on two calls over one run", () => {
    const run = expired(OLDEST)
    const configured = retention(KEPT, SWEEPS)

    expect(retentionPromiseOf(run, configured)).toEqual(retentionPromiseOf(run, configured))
  })
})

describe("describeRetentionPromise", () => {
  const line = (oldestMs: number, everyMs?: number): string =>
    describeRetentionPromise(retentionPromiseOf(expired(oldestMs), retention(KEPT, everyMs)))

  it("gives the operator both numbers and how far apart they are", () => {
    expect(line(OLDEST, SWEEPS)).toBe(
      "the oldest delivery kept is 3000000ms old and readers are promised one is gone within 1200000ms of arriving, " +
        "so that promise has been false for 1800000ms: this deployment is sweeping less often than it stated, or not at all"
    )
  })

  it("names the fold rather than the sweep where an uncounted delivery is what is left", () => {
    expect(
      describeRetentionPromise(
        retentionPromiseOf(expired(OLDEST, "uncounted"), retention(KEPT, SWEEPS))
      )
    ).toContain("the remedy is to run collection")
  })

  it("names the comparison rather than a verdict where the promise is being kept", () => {
    expect(line(16 * MINUTE, SWEEPS)).toBe(
      "the oldest delivery kept is 960000ms old, and readers are promised one is gone within 1200000ms of arriving"
    )
  })

  /** Each refusal is its own sentence, because they are three different facts. */
  it("says which of the three quiet answers it gave", () => {
    expect(line(OLDEST)).toContain("promised no ceiling")
    expect(
      describeRetentionPromise(
        retentionPromiseOf(
          { outcome: "nothing-expired", waiting: 0, oldestMs: null, stopped: "end" },
          retention(KEPT, SWEEPS)
        )
      )
    ).toContain("old enough to delete")
    expect(describeRetentionPromise({ state: "unread" })).toContain("no delivery was read")
  })
})
