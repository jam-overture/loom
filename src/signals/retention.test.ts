import { describe, expect, it } from "vitest"

import type { CollectionOutcome, CollectionSummary } from "./collect.js"
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
const retention = (windowMs: number, everyMs?: number): DeliveryRetention => {
  const { bufferMs, sweep } = collectionNoticeOf({
    windowMs,
    ...(everyMs === undefined ? {} : { sweep: { everyMs } }),
  })

  return { bufferMs, sweep }
}

/**
 * Three deliberately different lengths, because every way this reading could be
 * wrong is an addition with one term counted twice.
 *
 * Fifteen minutes to ripen, a five-minute cron, fifty minutes in the buffer: a
 * ceiling of twenty and a gap of thirty. Doubling the window gives a gap of
 * fifteen, doubling the interval gives twenty-five, doubling the ceiling gives
 * ten, and dropping the window gives forty-five — four plausible minute figures
 * and no two of them equal.
 */
const RIPENS = 15 * MINUTE
const SWEEPS = 5 * MINUTE
const CEILING = 20 * MINUTE
const OLDEST = 50 * MINUTE
const PAST = 30 * MINUTE

const summaryOf = (oldestMs: number): CollectionSummary => ({
  counted: 3,
  tallies: 2,
  funnels: 0,
  views: 3,
  uncorrelated: 0,
  redelivered: 0,
  oldestMs,
})

const collected = (oldestMs: number): CollectionOutcome => ({
  outcome: "collected",
  summary: summaryOf(oldestMs),
  removed: 3,
  more: false,
})

describe("retentionPromiseOf", () => {
  it("names the gap when the oldest delivery outlived the ceiling readers are promised", () => {
    expect(retentionPromiseOf(collected(OLDEST), retention(RIPENS, SWEEPS))).toEqual({
      state: "broken",
      oldestMs: OLDEST,
      goneWithinMs: CEILING,
      byMs: PAST,
    })
  })

  /**
   * The ceiling is the ripeness window plus one sweep, so a delivery exactly on
   * it is a sweep that ran on time and not one that is late. The boundary is
   * tested from both sides because a deployment sweeping on the interval it
   * stated sits on it: a reading that faulted at the boundary would cry wolf on
   * every healthy run, which is the one way it could be made useless.
   */
  it("keeps the promise at the ceiling and breaks it one millisecond past", () => {
    expect(retentionPromiseOf(collected(CEILING), retention(RIPENS, SWEEPS))).toMatchObject({
      state: "kept",
      oldestMs: CEILING,
    })
    expect(retentionPromiseOf(collected(CEILING + 1), retention(RIPENS, SWEEPS))).toMatchObject({
      state: "broken",
      byMs: 1,
    })
  })

  it("carries both figures when the promise is being kept, because the sentence is the comparison", () => {
    expect(retentionPromiseOf(collected(16 * MINUTE), retention(RIPENS, SWEEPS))).toEqual({
      state: "kept",
      oldestMs: 16 * MINUTE,
      goneWithinMs: CEILING,
    })
  })

  /**
   * A buffer months behind is still a deployment that promised nothing, so
   * there is no claim of its own to hold it to. The remedy is a stated
   * interval, and the operator hears about that from the setting.
   */
  it("judges nothing where the deployment stated no interval, however old the buffer is", () => {
    expect(retentionPromiseOf(collected(40 * 24 * 60 * MINUTE), retention(RIPENS))).toEqual({
      state: "unpromised",
    })
  })

  /**
   * Nothing ripe is the one quiet answer that is a proof: the scan runs from the
   * oldest end, so every delivery is younger than the ripeness window, and the
   * ceiling is that window plus a sweep.
   */
  it("reads a run that found nothing ripe as nothing being past the ceiling", () => {
    expect(
      retentionPromiseOf({ outcome: "nothing-ripe", waiting: 4 }, retention(RIPENS, SWEEPS))
    ).toEqual({ state: "unripe" })
  })

  it("says nothing about a run that never reached the buffer", () => {
    const configured = retention(RIPENS, SWEEPS)

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
   * buffer nothing could measure.
   */
  it("says nothing where the age is not a number, rather than keeping the promise", () => {
    expect(retentionPromiseOf(collected(Number.NaN), retention(RIPENS, SWEEPS))).toEqual({
      state: "unread",
    })
  })

  /**
   * A delivery stamped in the future is a clock disagreeing with itself, and it
   * answers by the same subtraction rather than by a special case: a negative
   * age is never longer than a positive ceiling (0274).
   */
  it("keeps the promise on a delivery received in the future", () => {
    expect(retentionPromiseOf(collected(-MINUTE), retention(RIPENS, SWEEPS))).toMatchObject({
      state: "kept",
      oldestMs: -MINUTE,
    })
  })

  /**
   * The counters took the window and the buffer still holds it, so the
   * deliveries that were judged are the deliveries still there. The outcome is
   * loud about its own failure; this reading answers the question it was asked.
   */
  it("judges a run whose buffer would not forget what it counted", () => {
    expect(
      retentionPromiseOf(
        {
          outcome: "counted-not-forgotten",
          summary: summaryOf(OLDEST),
          before: 41,
          error: { code: "unavailable", detail: "gone" },
        },
        retention(RIPENS, SWEEPS)
      )
    ).toMatchObject({ state: "broken", byMs: PAST })
  })

  /** One configuration, one answer, however often it is asked. */
  it("answers the same on two calls over one run", () => {
    const run = collected(OLDEST)
    const configured = retention(RIPENS, SWEEPS)

    expect(retentionPromiseOf(run, configured)).toEqual(retentionPromiseOf(run, configured))
  })
})

describe("describeRetentionPromise", () => {
  const line = (oldestMs: number, everyMs?: number): string =>
    describeRetentionPromise(retentionPromiseOf(collected(oldestMs), retention(RIPENS, everyMs)))

  it("gives the operator both numbers and how far apart they are", () => {
    expect(line(OLDEST, SWEEPS)).toBe(
      "the oldest delivery waiting is 3000000ms old and readers are promised one is gone within 1200000ms of arriving, " +
        "so that promise has been false for 1800000ms: this deployment is sweeping less often than it stated, or not at all"
    )
  })

  it("names the comparison rather than a verdict where the promise is being kept", () => {
    expect(line(16 * MINUTE, SWEEPS)).toBe(
      "the oldest delivery waiting is 960000ms old, and readers are promised one is gone within 1200000ms of arriving"
    )
  })

  /** Each refusal is its own sentence, because they are three different facts. */
  it("says which of the three quiet answers it gave", () => {
    expect(line(OLDEST)).toContain("promised no ceiling")
    expect(
      describeRetentionPromise(
        retentionPromiseOf({ outcome: "nothing-ripe", waiting: 0 }, retention(RIPENS, SWEEPS))
      )
    ).toContain("old enough to count")
    expect(describeRetentionPromise({ state: "unread" })).toContain("no delivery was read")
  })
})
