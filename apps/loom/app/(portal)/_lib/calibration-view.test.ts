import { describe, expect, it } from "vitest"

import { dispositionReasonCodeSchema, UNATTRIBUTED_POLICY_ID } from "@jam-overture/loom"
import type {
  CalibrationReport,
  CalibrationScore,
  PolicyCalibration,
} from "@jam-overture/loom/telemetry"

import type { MissCause } from "./calibration-misses"
import {
  describePolicy,
  formatRange,
  formatRate,
  isOnTheMark,
  MISS_CAUSE_LABELS,
  MISS_CAUSE_NOTES,
  NO_VALUE,
  plainScoreline,
  poolsMoreThanOneGate,
  readGap,
  readRuleset,
  readTrust,
} from "./calibration-view"

const scoreWith = (gap: number | null): CalibrationScore => ({
  judged: gap === null ? 0 : 4,
  survived: gap === null ? 0 : 2,
  observedRate: gap === null ? null : 0.5,
  meanConfidence: gap === null ? null : 0.5 + gap,
  gap,
})

describe("formatRate", () => {
  it("shows an absent rate as absent rather than as zero", () => {
    expect(formatRate(null)).toBe(NO_VALUE)
    expect(formatRate(0)).toBe("0%")
  })

  it("renders a rate as whole percent", () => {
    expect(formatRate(0.834)).toBe("83%")
  })
})

describe("formatRange", () => {
  it("marks every band but the last as excluding its upper bound", () => {
    expect(formatRange(0.2, 0.3, false)).toBe("20%–<30%")
  })

  /** The top band is closed, because a confidence of exactly 1 has to live somewhere. */
  it("closes the last band", () => {
    expect(formatRange(0.9, 1, true)).toBe("90%–100%")
  })
})

describe("readGap", () => {
  it("says nothing was judged rather than reporting a perfect score", () => {
    expect(readGap(scoreWith(null)).label).toBe("nothing judged")
  })

  /**
   * The tolerance is what keeps the page from reporting its own sample size.
   * Four claims will not land on the nose and a view that called that
   * overconfidence would be wrong far more often than the model.
   */
  it("treats a small difference as agreement", () => {
    expect(readGap(scoreWith(0.05)).label).toBe("on the mark")
    expect(readGap(scoreWith(-0.05)).label).toBe("on the mark")
  })

  it("distinguishes claiming too much from claiming too little", () => {
    expect(readGap(scoreWith(0.3)).tone).toBe("rejected")
    expect(readGap(scoreWith(-0.3)).tone).toBe("awaiting")
  })
})

describe("describePolicy", () => {
  it("shows a host's own policy name, because that is what it can look up", () => {
    expect(describePolicy("checkout-strict")).toBe("checkout-strict")
  })

  /**
   * Two unknowns and two different next moves: one is answered by widening the
   * window, the other never will be, because the record was written before the
   * Gate wrote down which policy made it.
   */
  it("tells a judgment off the end of the page apart from one that named no policy", () => {
    expect(describePolicy(null)).toBe("judged before this page begins")
    expect(describePolicy(UNATTRIBUTED_POLICY_ID)).toBe("judged before policies were named")
    expect(describePolicy(null)).not.toBe(describePolicy(UNATTRIBUTED_POLICY_ID))
  })
})

const segmentWith = (
  fingerprints: readonly string[],
  unfingerprinted = 0
): PolicyCalibration => ({
  policyId: "checkout",
  overall: scoreWith(0.1),
  buckets: [],
  fingerprints,
  unfingerprinted,
  checkSets: [[]],
  unrecordedChecks: 0,
})

const ONE = "aaaaaaaa:1111111111111111"
const EDITED = "aaaaaaaa:2222222222222222"
const OTHER_SCHEMA = "bbbbbbbb:2222222222222222"

describe("readRuleset", () => {
  it("says nothing about a name that kept meaning one thing", () => {
    expect(readRuleset(segmentWith([ONE]))).toBeNull()
  })

  it("names the row when two rulesets shared a name", () => {
    const note = readRuleset(segmentWith([ONE, EDITED]))

    expect(note?.tone).toBe("rejected")
    expect(note?.detail).toContain('"checkout"')
  })

  /**
   * An upgrade is not an incident. Reporting a change of Loom version as a change
   * of policy would cry wolf on every release, and the reader would learn to
   * ignore the one row that mattered.
   */
  it("separates a change of schema from a change of rules", () => {
    expect(readRuleset(segmentWith([ONE, OTHER_SCHEMA]))?.tone).toBe("inapplicable")
    expect(readRuleset(segmentWith([ONE, EDITED]))?.tone).toBe("rejected")
  })

  it("will not let a row with unrecorded judgments read as settled", () => {
    expect(readRuleset(segmentWith([ONE], 3))?.label).toBe("partly recorded")
    expect(readRuleset(segmentWith([], 3))?.label).toBe("no ruleset recorded")
  })

  it("carries the unrecorded count into a row that also changed", () => {
    expect(readRuleset(segmentWith([ONE, EDITED], 2))?.detail).toContain("2 of them")
  })
})

describe("poolsMoreThanOneGate", () => {
  const reportOf = (byPolicy: readonly PolicyCalibration[]): CalibrationReport => ({
    overall: scoreWith(0.1),
    buckets: [],
    byPolicy,
    unjudged: { "awaiting-answer": 0, failed: 0, unsettled: 0 },
    unattributed: 0,
    runtimeAuthored: 0,
  })

  it("is false for one gate that held still, which is the ordinary page", () => {
    expect(poolsMoreThanOneGate(reportOf([segmentWith([ONE])]))).toBe(false)
    expect(poolsMoreThanOneGate(reportOf([]))).toBe(false)
  })

  it("is true for two gates", () => {
    expect(poolsMoreThanOneGate(reportOf([segmentWith([ONE]), segmentWith([EDITED])]))).toBe(true)
  })

  /** The case a length check misses: one row, and still two gates behind it. */
  it("is true for one name that stopped meaning one thing", () => {
    expect(poolsMoreThanOneGate(reportOf([segmentWith([ONE, EDITED])]))).toBe(true)
  })

  it("is not tripped by a row that is merely unrecorded", () => {
    expect(poolsMoreThanOneGate(reportOf([segmentWith([], 5)]))).toBe(false)
  })
})

describe("isOnTheMark", () => {
  /**
   * Two components now ask this, and the point of exporting it is that they
   * cannot answer differently. A band called settled by the table and unsettled
   * by the misses beside it would be a disagreement invisible from either side.
   */
  it("agrees with the label the reader is shown", () => {
    expect(isOnTheMark(scoreWith(0.05))).toBe(true)
    expect(readGap(scoreWith(0.05)).label).toBe("on the mark")

    expect(isOnTheMark(scoreWith(0.3))).toBe(false)
    expect(readGap(scoreWith(0.3)).label).not.toBe("on the mark")
  })

  it("is false when there was nothing to compare", () => {
    expect(isOnTheMark(scoreWith(null))).toBe(false)
  })
})

describe("the miss vocabulary", () => {
  const CAUSES: readonly MissCause[] = [
    ...dispositionReasonCodeSchema.options,
    "discarded-by-human",
    "survived-anyway",
  ]

  /**
   * A reason code the runtime adds and this file does not would render as an
   * empty heading over a real group of claims — the same failure `episode-view`
   * guards, one level down. The `Record` catches it at compile time; this catches
   * a placeholder somebody typed to make the compiler stop.
   */
  it("has something to say about every cause a claim can have", () => {
    for (const cause of CAUSES) {
      expect(MISS_CAUSE_LABELS[cause]).not.toBe("")
      expect(MISS_CAUSE_NOTES[cause]).not.toBe("")
    }
  })

  /** A heading that repeated the code would make the grouping a `GROUP BY` with a title. */
  it("says something other than the code itself", () => {
    for (const cause of CAUSES) {
      expect(MISS_CAUSE_LABELS[cause]).not.toBe(cause)
    }
  })
})

/**
 * The plain-language half of the same reading. These tests are mostly about the
 * two of them agreeing: a verdict that could say "about as right as it says it
 * is" while the band beside it says "claimed more than it delivered" is the
 * failure the shared `isOnTheMark` exists to make impossible, and it would look
 * fine on either screen alone.
 */
describe("readTrust", () => {
  it("answers the question the page asks rather than reporting a statistic", () => {
    expect(readTrust(scoreWith(0.3)).label).toBe("The AI has been over-sure of itself")
    expect(readTrust(scoreWith(-0.3)).label).toBe(
      "The AI has been harder on itself than it needed to be"
    )
    expect(readTrust(scoreWith(0.02)).label).toBe(
      "The AI has been about as right as it says it is"
    )
  })

  it("tells every reader what to do next, in every state", () => {
    for (const gap of [null, 0.02, 0.3, -0.3]) {
      expect(readTrust(scoreWith(gap)).next.length).toBeGreaterThan(0)
    }
  })

  it("says there is nothing to read rather than scoring an empty window", () => {
    const verdict = readTrust(scoreWith(null))

    expect(verdict.label).toBe("Not enough answers yet")
    expect(verdict.tone).toBe("inapplicable")
  })

  /**
   * The one property worth pinning. Both readings are derived from the same gap
   * and the same tolerance, so a band the technical reading calls settled cannot
   * be a project the plain one calls over-sure.
   */
  it("agrees with the technical reading it summarises, band for band", () => {
    for (const gap of [null, -0.4, -0.11, -0.09, 0, 0.09, 0.11, 0.4]) {
      const score = scoreWith(gap)

      expect(readTrust(score).tone).toBe(readGap(score).tone)
    }
  })

  /** A verdict is a sentence about the AI, never a number the reader must decode. */
  it("puts no percentage in the words a person reads first", () => {
    for (const gap of [null, 0.02, 0.3, -0.3]) {
      const verdict = readTrust(scoreWith(gap))

      expect(`${verdict.label} ${verdict.meaning} ${verdict.next}`).not.toMatch(/\d/)
    }
  })
})

describe("plainScoreline", () => {
  it("says the counts a rate hides — of how many, and how many the AI expected", () => {
    expect(plainScoreline({ judged: 10, survived: 6, observedRate: 0.6, meanConfidence: 0.8, gap: 0.2 })).toBe(
      "10 changes have been answered. 6 went through. The AI expected about 8."
    )
  })

  it("counts one change as one change", () => {
    expect(plainScoreline({ judged: 1, survived: 1, observedRate: 1, meanConfidence: 0.9, gap: -0.1 })).toBe(
      "1 change has been answered. 1 went through. The AI expected about 1."
    )
  })

  /**
   * A scoreline over nothing is a sentence made of zeroes, and the empty state
   * says the same thing better. Absent rather than "0 changes went through".
   */
  it("has nothing to say when nothing was judged", () => {
    expect(plainScoreline(scoreWith(null))).toBeNull()
  })

  /**
   * The counts are the rates rounded, so the sentence and the table underneath
   * it are the same measurement rather than two.
   */
  it("rounds from the same rates the table prints", () => {
    const score = { judged: 7, survived: 5, observedRate: 5 / 7, meanConfidence: 0.61, gap: -0.104 }

    expect(plainScoreline(score)).toContain("5 went through")
    expect(plainScoreline(score)).toContain("about 4")
  })
})
