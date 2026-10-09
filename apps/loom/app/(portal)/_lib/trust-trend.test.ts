import { describe, expect, it } from "vitest"

import type { CalibrationReport, RecordedTelemetry } from "@jam-overture/loom/telemetry"

import { GAP_TOLERANCE } from "./calibration-view"
import {
  COMPARABLE_MINIMUM,
  plainSpan,
  readTrend,
  spanOf,
  type TrendSpan,
} from "./trust-trend"

const RULES = "abc123"

const spanWith = (over: Partial<TrendSpan> = {}): TrendSpan => ({
  judged: 20,
  gap: 0.3,
  observedRate: 0.5,
  meanConfidence: 0.8,
  unattributed: 0,
  rulesets: [RULES],
  unfingerprinted: 0,
  from: "2026-10-01T00:00:00.000Z",
  to: "2026-10-05T00:00:00.000Z",
  ...over,
})

/**
 * A stretch with one of its ends missing, which `exactOptionalPropertyTypes`
 * makes a different thing from one whose end is `undefined` — and the former is
 * what a journal page with no timestamps actually produces.
 */
const without = (span: TrendSpan, end: "from" | "to"): TrendSpan => {
  if (end === "from") {
    const { from, ...rest } = span

    return rest
  }

  const { to, ...rest } = span

  return rest
}

describe("COMPARABLE_MINIMUM", () => {
  it("is derived from the band the verdict is drawn at rather than chosen", () => {
    expect(COMPARABLE_MINIMUM).toBe(Math.ceil(1 / GAP_TOLERANCE))
  })

  it("is the point at which one claim flipping stops outweighing the tolerance", () => {
    expect(1 / COMPARABLE_MINIMUM).toBeLessThanOrEqual(GAP_TOLERANCE)
    expect(1 / (COMPARABLE_MINIMUM - 1)).toBeGreaterThan(GAP_TOLERANCE)
  })
})

describe("spanOf", () => {
  const reportWith = (over: Partial<CalibrationReport> = {}): CalibrationReport => ({
    overall: { judged: 12, survived: 6, observedRate: 0.5, meanConfidence: 0.8, gap: 0.3 },
    buckets: [],
    byPolicy: [
      {
        policyId: "strict",
        overall: { judged: 12, survived: 6, observedRate: 0.5, meanConfidence: 0.8, gap: 0.3 },
        buckets: [],
        fingerprints: [RULES],
        unfingerprinted: 2,
        checkSets: [[]],
        unrecordedChecks: 0,
      },
    ],
    unjudged: { "awaiting-answer": 1, failed: 0, unsettled: 0 },
    unattributed: 3,
    runtimeAuthored: 4,
    ...over,
  })

  const recorded = (seq: number, recordedAt: string): RecordedTelemetry =>
    ({ seq, recordedAt }) as unknown as RecordedTelemetry

  it("carries the overall score, the records that could not be attributed, and the rulesets", () => {
    const span = spanOf(reportWith(), [])

    expect(span).toMatchObject({
      judged: 12,
      gap: 0.3,
      observedRate: 0.5,
      meanConfidence: 0.8,
      unattributed: 3,
      rulesets: [RULES],
      unfingerprinted: 2,
    })
  })

  it("takes the span's ends off the first and last record, which a page orders ascending", () => {
    const span = spanOf(reportWith(), [
      recorded(1, "2026-09-30T08:00:00.000Z"),
      recorded(2, "2026-10-02T09:00:00.000Z"),
      recorded(3, "2026-10-04T10:00:00.000Z"),
    ])

    expect(span.from).toBe("2026-09-30T08:00:00.000Z")
    expect(span.to).toBe("2026-10-04T10:00:00.000Z")
  })

  it("leaves the ends absent rather than inventing them when there are no records", () => {
    expect(spanOf(reportWith(), []).from).toBeUndefined()
    expect(spanOf(reportWith(), []).to).toBeUndefined()
  })

  it("counts a ruleset once however many segments named it, and sums the unrecorded", () => {
    const segment = reportWith().byPolicy[0]
    if (segment === undefined) throw new Error("fixture")

    const span = spanOf(
      reportWith({
        byPolicy: [
          { ...segment, fingerprints: [RULES, "def456"], unfingerprinted: 1 },
          { ...segment, policyId: "loose", fingerprints: [RULES], unfingerprinted: 2 },
        ],
      }),
      []
    )

    expect(span.rulesets).toEqual(["abc123", "def456"])
    expect(span.unfingerprinted).toBe(3)
  })
})

describe("plainSpan", () => {
  it("reads as a range of days rather than two timestamps", () => {
    expect(plainSpan(spanWith())).toBe("1 October 2026 to 5 October 2026")
  })

  it("says one day once when the whole stretch arrived on it", () => {
    expect(
      plainSpan(spanWith({ from: "2026-10-05T01:00:00.000Z", to: "2026-10-05T23:00:00.000Z" }))
    ).toBe("5 October 2026")
  })

  it("is absent rather than half a range when an end is missing", () => {
    expect(plainSpan(without(spanWith(), "to"))).toBeUndefined()
    expect(plainSpan(without(spanWith(), "from"))).toBeUndefined()
  })
})

describe("readTrend", () => {
  it("says the record does not go back further rather than drawing nothing", () => {
    const trend = readTrend(spanWith(), "none")

    expect(trend.kind).toBe("no-earlier-record")
    expect(trend.label).toMatch(/as far back as the record goes/i)
    expect(trend.next).not.toBe("")
  })

  it("keeps a failed read apart from a record that has no before", () => {
    expect(readTrend(spanWith(), "unreadable").kind).toBe("unreadable")
    expect(readTrend(spanWith(), "unreadable").meaning).toMatch(/verdict above is good/i)
  })

  it("refuses a comparison when either stretch is under the floor, and names which", () => {
    const thin = readTrend(spanWith(), spanWith({ judged: COMPARABLE_MINIMUM - 1 }))
    expect(thin.kind).toBe("too-few-to-compare")
    expect(thin.meaning).toMatch(/the stretch before this one/)

    const thinNow = readTrend(
      spanWith({ judged: COMPARABLE_MINIMUM - 1 }),
      spanWith({ judged: 40 })
    )
    expect(thinNow.kind).toBe("too-few-to-compare")
    expect(thinNow.meaning).toMatch(/this stretch of the record/)
  })

  it("compares at the floor itself", () => {
    const trend = readTrend(
      spanWith({ judged: COMPARABLE_MINIMUM }),
      spanWith({ judged: COMPARABLE_MINIMUM })
    )

    expect(trend.kind).toBe("steady")
  })

  it("refuses a comparison when neither stretch has a gap to compare", () => {
    expect(readTrend(spanWith({ gap: null }), spanWith()).kind).toBe("too-few-to-compare")
    expect(readTrend(spanWith(), spanWith({ gap: null })).kind).toBe("too-few-to-compare")
  })

  it("will not attribute a movement to the AI when the rules changed in between", () => {
    const trend = readTrend(spanWith({ gap: 0.05 }), spanWith({ rulesets: ["other"] }))

    expect(trend.kind).toBe("rules-changed")
    expect(trend.label).toMatch(/isn't about the AI/i)
  })

  it("will not compare two stretches that are not each shown to be one ruleset", () => {
    expect(readTrend(spanWith({ rulesets: [RULES, "two"] }), spanWith()).kind).toBe(
      "rules-changed"
    )
    expect(readTrend(spanWith(), spanWith({ rulesets: [] })).kind).toBe("rules-changed")
    expect(readTrend(spanWith({ unfingerprinted: 1 }), spanWith()).kind).toBe("rules-changed")
    expect(readTrend(spanWith(), spanWith({ unfingerprinted: 1 })).kind).toBe("rules-changed")
  })

  it("calls a gap that shrank better and a gap that grew worse", () => {
    expect(readTrend(spanWith({ gap: 0.05 }), spanWith({ gap: 0.4 })).kind).toBe("closer")
    expect(readTrend(spanWith({ gap: 0.4 }), spanWith({ gap: 0.05 })).kind).toBe("further")
  })

  it("reads a gap as a distance, so hedging less and over-claiming more are both worse", () => {
    const wasUnderclaiming = readTrend(spanWith({ gap: 0.4 }), spanWith({ gap: -0.05 }))
    expect(wasUnderclaiming.kind).toBe("further")

    const nowUnderclaiming = readTrend(spanWith({ gap: -0.4 }), spanWith({ gap: 0.05 }))
    expect(nowUnderclaiming.kind).toBe("further")

    const crossedTheMark = readTrend(spanWith({ gap: -0.05 }), spanWith({ gap: 0.4 }))
    expect(crossedTheMark.kind).toBe("closer")
  })

  it("calls a movement inside the tolerance no movement", () => {
    /* Written as literals rather than as arithmetic on the tolerance: `0.3 + 0.1`
     * is 0.4000000000000001 in binary floating point, so a test built that way
     * would be asserting the rounding error rather than the band. */
    expect(readTrend(spanWith({ gap: 0.3 }), spanWith({ gap: 0.35 })).kind).toBe("steady")
    expect(readTrend(spanWith({ gap: 0.3 }), spanWith({ gap: 0.5 })).kind).toBe("closer")
  })

  /*
   * The point of the whole unit. A page that drew the pass rate going up and
   * called it better would be wrong, and these are the three shapes where a
   * reader would otherwise read it that way.
   */
  describe("the pass rate, when it is not what the verdict says", () => {
    it("says so when more changes went through and the AI read itself worse", () => {
      const trend = readTrend(
        spanWith({ gap: 0.4, observedRate: 0.8 }),
        spanWith({ gap: 0.05, observedRate: 0.4 })
      )

      expect(trend.kind).toBe("further")
      expect(trend.aside).toMatch(/More changes went through/)
      expect(trend.aside).toMatch(/not an improvement/)
    })

    it("says so when fewer went through and the AI read itself better", () => {
      const trend = readTrend(
        spanWith({ gap: 0.05, observedRate: 0.3 }),
        spanWith({ gap: 0.4, observedRate: 0.8 })
      )

      expect(trend.kind).toBe("closer")
      expect(trend.aside).toMatch(/Fewer changes went through/)
      expect(trend.aside).toMatch(/saying so in advance/)
    })

    it("says the claims moved with the rate when the gap held still", () => {
      const trend = readTrend(
        spanWith({ gap: 0.3, observedRate: 0.8, meanConfidence: 1 }),
        spanWith({ gap: 0.3, observedRate: 0.4, meanConfidence: 0.7 })
      )

      expect(trend.kind).toBe("steady")
      expect(trend.aside).toMatch(/claimed more in step/)
    })

    it("stays silent when the rate and the verdict agree", () => {
      const agreeing = readTrend(
        spanWith({ gap: 0.05, observedRate: 0.8 }),
        spanWith({ gap: 0.4, observedRate: 0.4 })
      )
      expect(agreeing.kind).toBe("closer")
      expect(agreeing.aside).toBeUndefined()

      const alsoAgreeing = readTrend(
        spanWith({ gap: 0.4, observedRate: 0.4 }),
        spanWith({ gap: 0.05, observedRate: 0.8 })
      )
      expect(alsoAgreeing.kind).toBe("further")
      expect(alsoAgreeing.aside).toBeUndefined()
    })

    it("stays silent when the rate barely moved", () => {
      const trend = readTrend(
        spanWith({ gap: 0.4, observedRate: 0.5 }),
        spanWith({ gap: 0.05, observedRate: 0.55 })
      )

      expect(trend.kind).toBe("further")
      expect(trend.aside).toBeUndefined()
    })
  })

  it("never puts a runtime word on the surface", () => {
    const every = [
      readTrend(spanWith(), "none"),
      readTrend(spanWith(), "unreadable"),
      readTrend(spanWith(), spanWith({ judged: 1 })),
      readTrend(spanWith(), spanWith({ rulesets: ["other"] })),
      readTrend(spanWith({ gap: 0.3 }), spanWith({ gap: 0.3 })),
      readTrend(spanWith({ gap: 0.05 }), spanWith({ gap: 0.4 })),
      readTrend(spanWith({ gap: 0.4 }), spanWith({ gap: 0.05 })),
    ]

    for (const trend of every) {
      const surface = [trend.label, trend.meaning, trend.next, trend.aside ?? ""].join(" ")

      /* `confidence` is not on this list: the portal says it on the surface
       * already — `readTrust` does — because it is a word a person uses. These
       * are the ones only the runtime uses. */
      expect(surface).not.toMatch(/calibrat|\bgap\b|fingerprint|ruleset|episode|disposition/i)
      expect(trend.next).not.toBe("")
    }
  })
})
