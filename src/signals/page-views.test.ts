import { describe, expect, it } from "vitest"

import { batchOf, OTHER_TREE, TREE, viewed, viewKey } from "../testing/reader-signal-contract.js"

import { openingsOf, pageViewReadingOf, type StoredPageViews } from "./page-views.js"

const AT = "2026-10-03T00:00:00.000Z"

const row = (over: Partial<StoredPageViews> = {}): StoredPageViews => ({
  treeId: TREE,
  revision: 1,
  opened: 0,
  appearances: 0,
  updatedAt: AT,
  ...over,
})

describe("openingsOf", () => {
  it("counts the page view a delivery opened", () => {
    const openings = openingsOf([batchOf([viewed("a")], { view: viewKey(1), first: true })])

    expect(openings).toEqual([{ treeId: TREE, revision: 1, views: 1 }])
  })

  /**
   * The whole reason the marker exists. A reader who stays on a page delivers a
   * batch every few seconds, so counting deliveries would make one visitor look
   * like a crowd — and would invert the region floor rather than merely blur it
   * (0214).
   */
  it("counts nothing for the deliveries that follow the opening one", () => {
    const openings = openingsOf([
      batchOf([viewed("b")], { view: viewKey(1) }),
      batchOf([viewed("c")], { view: viewKey(1) }),
    ])

    expect(openings).toEqual([])
  })

  /**
   * A queue draining after an outage posts what it held, which may include the
   * opening batch whose first delivery it could not confirm. A page view counted
   * twice cannot be uncounted (0158), so the keys are compared rather than the
   * batches.
   */
  it("counts one page view when the same opening arrives twice in one delivery", () => {
    const opening = batchOf([viewed("a")], { view: viewKey(1), first: true })

    expect(openingsOf([opening, opening])[0]?.views).toBe(1)
  })

  it("counts two readers who opened inside the same delivery", () => {
    const openings = openingsOf([
      batchOf([viewed("a")], { view: viewKey(1), first: true }),
      batchOf([viewed("a")], { view: viewKey(2), first: true }),
    ])

    expect(openings[0]?.views).toBe(2)
  })

  it("counts nothing for a sender that opens nothing", () => {
    expect(openingsOf([batchOf([viewed("a")], { view: viewKey(1) })])).toEqual([])
  })

  /** An opening with no page view to open is not a reader arriving. */
  it("counts nothing for an opening that names no page view", () => {
    expect(openingsOf([batchOf([viewed("a")], { first: true })])).toEqual([])
  })

  it("keeps the revisions a delivery opened apart", () => {
    const openings = openingsOf([
      batchOf([viewed("a")], { view: viewKey(1), first: true }),
      batchOf([viewed("a")], { view: viewKey(2), first: true, revision: 2 }),
    ])

    expect(openings.map((opening) => `${opening.revision}:${opening.views}`).sort()).toEqual([
      "1:1",
      "2:1",
    ])
  })

  it("keeps trees apart", () => {
    const openings = openingsOf([
      batchOf([viewed("a")], { view: viewKey(1), first: true }),
      batchOf([viewed("a")], { view: viewKey(2), first: true, treeId: OTHER_TREE }),
    ])

    expect(openings.map((opening) => opening.treeId).sort()).toEqual([TREE, OTHER_TREE].sort())
  })

  it("counts nothing from nothing", () => {
    expect(openingsOf([])).toEqual([])
  })
})

describe("pageViewReadingOf", () => {
  it("reads nothing as nothing, and no inflation rather than none", () => {
    expect(pageViewReadingOf([])).toEqual({
      opened: 0,
      appearances: 0,
      drift: 0,
      pending: 0,
      inflation: null,
      revisions: [],
    })
  })

  it("reports the page views that began", () => {
    const reading = pageViewReadingOf([row({ opened: 40, appearances: 40 })])

    expect(reading.opened).toBe(40)
    expect(reading.drift).toBe(0)
    expect(reading.inflation).toBe(0)
  })

  /**
   * The measurement this table exists for. Forty-four appearances of forty page
   * views is four readers whose visit spanned a rollup boundary, so every
   * distinct count stored against that revision is 10% generous — a number from
   * the rows rather than from 0147's arithmetic about window lengths.
   */
  it("measures the over-count in the distinct counts as the difference", () => {
    const reading = pageViewReadingOf([row({ opened: 40, appearances: 44 })])

    expect(reading.drift).toBe(4)
    expect(reading.inflation).toBeCloseTo(0.1)
    expect(reading.revisions[0]).toMatchObject({ drift: 4, pending: 0 })
  })

  /**
   * A reading taken between a delivery and the next collection. The openings are
   * durable and the window they belong to is still in the buffer, which is not a
   * negative drift — a reading that showed one would make a deployment whose
   * collection has stopped look like a deployment whose counters were exact.
   */
  it("reports openings no rollup has reached as pending rather than as a negative drift", () => {
    const reading = pageViewReadingOf([row({ opened: 12, appearances: 5 })])

    expect(reading.pending).toBe(7)
    expect(reading.drift).toBe(0)
    expect(reading.inflation).toBe(0)
  })

  /** Two signs of one subtraction, so no revision can carry both. */
  it("never reports drift and pending for the same revision", () => {
    for (const [opened, appearances] of [
      [10, 10],
      [10, 3],
      [3, 10],
      [0, 4],
      [4, 0],
    ] as const) {
      const [revision] = pageViewReadingOf([row({ opened, appearances })]).revisions

      expect(Math.min(revision?.drift ?? 0, revision?.pending ?? 0)).toBe(0)
    }
  })

  /**
   * Totalled from the rows rather than from the two sums. A revision
   * mid-collection and a revision with straddles would cancel each other in the
   * aggregate, and the page would claim counters more exact than any revision
   * on it.
   */
  it("adds each revision's drift rather than subtracting the totals", () => {
    const reading = pageViewReadingOf([
      row({ revision: 1, opened: 10, appearances: 14 }),
      row({ revision: 2, opened: 10, appearances: 6 }),
    ])

    expect(reading).toMatchObject({ opened: 20, appearances: 20, drift: 4, pending: 4 })
    expect(reading.inflation).toBeCloseTo(0.2)
  })

  it("has no inflation to report for a revision nobody opened", () => {
    expect(pageViewReadingOf([row({ opened: 0, appearances: 3 })]).revisions[0]?.inflation).toBeNull()
  })

  it("reads the newest revision of a tree first, and trees in id order", () => {
    const reading = pageViewReadingOf([
      row({ revision: 2 }),
      row({ revision: 7 }),
      row({ treeId: OTHER_TREE, revision: 1 }),
    ])

    expect(reading.revisions.map((one) => `${one.treeId}:${one.revision}`)).toEqual([
      `${TREE}:7`,
      `${TREE}:2`,
      `${OTHER_TREE}:1`,
    ])
  })

  it("keeps the instant each row last moved", () => {
    expect(pageViewReadingOf([row({ updatedAt: AT })]).revisions[0]?.updatedAt).toBe(AT)
  })
})
