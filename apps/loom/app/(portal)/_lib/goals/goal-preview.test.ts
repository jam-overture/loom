import { describe, expect, it } from "vitest"

import { nodeIdSchema, treeIdSchema } from "@jam-overture/loom"

import type { GoalTarget, PartsByPage } from "./goal"
import { previewOf, previewWordsOf, type RangeTotals } from "./goal-preview"

const HOME = treeIdSchema.parse("t_home")
const PRICING = treeIdSchema.parse("t_pricing")
const ABOUT = treeIdSchema.parse("t_about")
const START = nodeIdSchema.parse("n_start")
const OTHER = nodeIdSchema.parse("n_other")
const FROM = Date.UTC(2026, 10, 1, 12)

const PARTS: PartsByPage = new Map([
  [HOME, new Set([START])],
  [PRICING, new Set([START, OTHER])],
  [ABOUT, new Set([OTHER])],
])

const counts = (activated: number, completed = 0, disclosed = 0) => ({
  activated,
  completed,
  disclosed,
})

const TOTALS: Extract<RangeTotals, { kind: "read" }> = {
  kind: "read",
  from: FROM,
  clipped: false,
  pages: [
    { treeId: HOME, views: 400 },
    { treeId: PRICING, views: 100 },
    { treeId: ABOUT, views: 5_000 },
  ],
  parts: [
    { treeId: HOME, nodeId: START, counts: counts(8, 0, 3) },
    { treeId: PRICING, nodeId: START, counts: counts(2) },
    { treeId: ABOUT, nodeId: OTHER, counts: counts(90) },
  ],
}

const target = (overrides: Partial<GoalTarget> = {}): GoalTarget => ({
  kind: "activated",
  nodeId: START,
  pages: null,
  ...overrides,
})

describe("previewOf", () => {
  it("adds up the kind on the part over the page views of every page that has it", () => {
    expect(previewOf(target(), TOTALS, PARTS)).toEqual({ count: 10, pageViews: 500 })
  })

  it("adds up only the pages chosen", () => {
    expect(previewOf(target({ pages: [PRICING] }), TOTALS, PARTS)).toEqual({
      count: 2,
      pageViews: 100,
    })
  })

  it("adds up the kind asked for and no other", () => {
    expect(previewOf(target({ kind: "disclosed" }), TOTALS, PARTS)).toEqual({
      count: 3,
      pageViews: 500,
    })
  })
})

describe("previewWordsOf", () => {
  it("says what the goal would have counted over the last 7 days", () => {
    expect(previewWordsOf(target(), TOTALS, PARTS)).toEqual({
      tone: "counted",
      sentence:
        "Over the last 7 days it would have counted 10 presses in 500 page views, 2 per 100.",
    })
  })

  it("says where counting began when that is inside the week", () => {
    expect(previewWordsOf(target(), { ...TOTALS, clipped: true }, PARTS).sentence).toMatch(
      /Counted by the hour from 1 November 2026 at 12:00 UTC\.$/u
    )
  })

  it("asks for the part before it has anything to add up", () => {
    expect(previewWordsOf(undefined, TOTALS, PARTS)).toEqual({
      tone: "waiting",
      sentence:
        "Choose the part, and this says what the goal would have counted over the last 7 days.",
    })
  })

  it("says the pages it would cover had no page views, rather than a nought", () => {
    expect(previewWordsOf(target(), { ...TOTALS, pages: [] }, PARTS)).toEqual({
      tone: "waiting",
      sentence: "No page views in the last 7 days on the pages it would cover.",
    })
  })

  it("says nothing was counted by the hour, and when the counters did not answer", () => {
    expect(previewWordsOf(target(), { kind: "uncounted" }, PARTS).sentence).toBe(
      "Nothing has been counted by the hour yet, so there is no week to preview."
    )
    expect(previewWordsOf(target(), { kind: "unreadable" }, PARTS).sentence).toBe(
      "What it would have counted over the last 7 days cannot be read just now."
    )
  })
})
