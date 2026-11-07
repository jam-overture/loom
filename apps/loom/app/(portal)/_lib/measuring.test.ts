import { describe, expect, it } from "vitest"

import { nodeIdSchema, primitiveTypeSchema, treeIdSchema } from "@jam-overture/loom"
import type { StoredActed, StoredArrivals } from "@jam-overture/loom/signals"
import { DEFAULT_AUDIENCE_ID } from "@jam-overture/loom/store"

import {
  isShort,
  MEASURING_MS,
  measurementOf,
  MIN_VIEWS_A_SIDE,
  sideOf,
  sideSentence,
  soFarSentence,
  testLines,
  testOf,
  verdictOf,
  verdictSentence,
  windowsOf,
  type Side,
} from "./measuring"

const HOUR = 3_600_000
const DAY = 24 * HOUR
const LIVE = Date.UTC(2026, 10, 7, 9, 0)
const PAGE = treeIdSchema.parse("t_home")
const PART = nodeIdSchema.parse("n_start")
const BUTTON = primitiveTypeSchema.parse("loom.button")

const side = (views: number, count: number): Side => ({
  range: { from: LIVE, to: LIVE + MEASURING_MS },
  views,
  count,
})

const arrivals = (
  rows: readonly (readonly [number, number])[],
  begins?: number
): StoredArrivals => ({
  hours: rows.map(([hour, views]) => ({
    treeId: PAGE,
    revision: 1,
    hour,
    views,
    audienceId: DEFAULT_AUDIENCE_ID,
    updatedAt: new Date(hour).toISOString(),
  })),
  ...(begins === undefined ? {} : { begins }),
})

const acted = (rows: readonly (readonly [number, number])[]): StoredActed => ({
  hours: rows.map(([hour, activations]) => ({
    treeId: PAGE,
    revision: 1,
    nodeId: PART,
    type: BUTTON,
    hour,
    activations,
    opens: 0,
    closes: 0,
    completions: 0,
    audienceId: DEFAULT_AUDIENCE_ID,
    updatedAt: new Date(hour).toISOString(),
  })),
})

describe("windowsOf", () => {
  it("takes 14 days each side of the hour it went live in, and leaves that hour out", () => {
    const at = LIVE + 20 * 60_000

    expect(windowsOf(at, {})).toEqual({
      before: { from: LIVE - MEASURING_MS, to: LIVE },
      after: { from: LIVE + HOUR, to: LIVE + HOUR + MEASURING_MS },
    })
  })

  it("leaves no hour out when it went live on the hour", () => {
    const windows = windowsOf(LIVE, {})

    expect(windows.before.to).toBe(LIVE)
    expect(windows.after.from).toBe(LIVE)
  })

  it("starts the before side at the page's previous change, or when counting began", () => {
    expect(windowsOf(LIVE, { previous: LIVE - 3 * DAY - 1 }).before.from).toBe(LIVE - 3 * DAY)
    expect(windowsOf(LIVE, {}, LIVE - 2 * DAY).before.from).toBe(LIVE - 2 * DAY)
    expect(isShort(windowsOf(LIVE, {}, LIVE - 2 * DAY).before)).toBe(true)
  })

  it("ends the after side at the page's next change", () => {
    expect(windowsOf(LIVE, { next: LIVE + 5 * DAY + 1 }).after).toEqual({
      from: LIVE,
      to: LIVE + 5 * DAY,
    })
  })

  it("never makes a side that ends before it starts", () => {
    const windows = windowsOf(LIVE, { next: LIVE + 1 }, LIVE + DAY)

    expect(windows.before).toEqual({ from: LIVE, to: LIVE })
    expect(windows.after).toEqual({ from: LIVE, to: LIVE })
  })
})

describe("sideOf", () => {
  it("adds the hours inside the side and nothing outside it", () => {
    const range = { from: LIVE, to: LIVE + 2 * HOUR }
    const read = sideOf(
      range,
      arrivals([
        [LIVE - HOUR, 50],
        [LIVE, 10],
        [LIVE + HOUR, 20],
        [LIVE + 2 * HOUR, 70],
      ]),
      acted([
        [LIVE, 1],
        [LIVE + HOUR, 2],
        [LIVE + 2 * HOUR, 9],
      ]),
      "activated"
    )

    expect(read).toEqual({ range, views: 30, count: 3 })
  })
})

describe("testOf", () => {
  it("takes the pooled two-proportion test of after against before", () => {
    const test = testOf(side(4_000, 100), side(4_000, 160))

    expect(test.kind).toBe("tested")
    expect(test.kind === "tested" && test.z).toBeCloseTo(3.7833, 3)
    expect(test.kind === "tested" && test.p).toBeCloseTo(0.000155, 5)
  })

  it("does not test a figure that is not a share of page views", () => {
    expect(testOf(side(1_000, 1_200), side(1_000, 900))).toEqual({ kind: "not-a-share" })
  })

  it("has nothing to compare where nothing varies", () => {
    expect(testOf(side(1_000, 0), side(1_000, 0))).toEqual({ kind: "no-variation" })
  })
})

describe("verdictOf", () => {
  it("is too early below 1,000 page views on either side, saying how many more", () => {
    const verdict = verdictOf(side(MIN_VIEWS_A_SIDE, 30), side(640, 40))

    expect(verdict).toEqual({ kind: "too-early", needs: 360 })
    expect(verdictSentence(verdict)).toBe(
      "Each side needs 1,000 page views before Loom can say; the thinner side was 360 short."
    )
    expect(testLines(verdict)).toEqual(["No test is taken below 1,000 page views a side."])
  })

  it("says helped only where a rise holds up at 95%", () => {
    expect(verdictOf(side(4_000, 100), side(4_000, 160)).kind).toBe("helped")
    expect(verdictOf(side(4_000, 100), side(4_000, 115)).kind).toBe("no-clear-change")
  })

  it("says hurt only where a fall holds up at 95%", () => {
    expect(verdictOf(side(4_000, 160), side(4_000, 100)).kind).toBe("hurt")
  })

  it("gives no clear change where the test cannot be taken, and says why", () => {
    const verdict = verdictOf(side(1_000, 1_200), side(1_000, 2_000))

    expect(verdict).toEqual({ kind: "no-clear-change", test: { kind: "not-a-share" } })
    expect(verdictSentence(verdict)).toContain("not a share of page views")
  })
})

describe("measurementOf", () => {
  it("starts counting with the later counter, so a side has no hours nothing was counted in", () => {
    const measurement = measurementOf(LIVE, {}, "activated", {
      arrivals: arrivals(
        [
          [LIVE - 5 * DAY, 400],
          [LIVE - DAY, 600],
          [LIVE + DAY, 900],
        ],
        LIVE - 5 * DAY
      ),
      acted: acted([
        [LIVE - DAY, 6],
        [LIVE + DAY, 9],
      ]),
      actedBegins: LIVE - 2 * DAY,
    })

    expect(measurement).toMatchObject({
      kind: "read",
      before: { range: { from: LIVE - 2 * DAY, to: LIVE }, views: 600, count: 6 },
      after: { views: 900, count: 9 },
    })
  })
})

describe("sentences", () => {
  it("says each side with its days and figures", () => {
    expect(sideSentence("Before", side(480, 12), "activated")).toBe(
      "Before (7 November 2026 to 21 November 2026, 14 days): 12 presses in 480 page views, 2.5 per 100."
    )
    expect(soFarSentence(side(0, 0), "activated")).toBe("So far: no page views.")
    expect(
      sideSentence("Before", { range: { from: LIVE, to: LIVE }, views: 0, count: 0 }, "activated")
    ).toBe("Before: nothing was counted.")
  })
})
