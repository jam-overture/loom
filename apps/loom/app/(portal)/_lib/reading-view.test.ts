import { describe, expect, it } from "vitest"

import { nodeIdSchema, primitiveTypeSchema, treeIdSchema } from "@loom/runtime"
import type { StoredTally } from "@loom/runtime/signals"

import type { PartName } from "./part-name"
import {
  dwellEach,
  highlightsOf,
  outOfVisits,
  pageReadings,
  plainDuration,
  plainShift,
  rateOf,
  reachShifts,
  revisionReadings,
  shiftOf,
  type RevisionReading,
} from "./reading-view"

const treeId = treeIdSchema.parse("t_1")
const other = treeIdSchema.parse("t_2")

const tally = (
  nodeId: string,
  counts: Partial<Omit<StoredTally, "treeId" | "revision" | "nodeId" | "type" | "updatedAt">> & {
    readonly revision?: number
    readonly type?: string
    readonly treeId?: typeof treeId
  } = {}
): StoredTally => ({
  treeId: counts.treeId ?? treeId,
  revision: counts.revision ?? 1,
  nodeId: nodeIdSchema.parse(nodeId),
  type: primitiveTypeSchema.parse(counts.type ?? "loom.card"),
  views: counts.views ?? 0,
  reached: counts.reached ?? 0,
  dwellMs: counts.dwellMs ?? 0,
  activations: counts.activations ?? 0,
  opens: counts.opens ?? 0,
  closes: counts.closes ?? 0,
  updatedAt: "2026-09-15T00:00:00.000Z",
})

const readingOf = (tallies: readonly StoredTally[], names?: ReadonlyMap<string, PartName>) =>
  revisionReadings(tallies, names)[0]!

describe("grouping what readers did", () => {
  it("keeps two revisions of one page apart rather than adding them up", () => {
    const readings = revisionReadings([
      tally("n_a", { revision: 1, views: 10, reached: 4 }),
      tally("n_a", { revision: 2, views: 10, reached: 9 }),
    ])

    expect(readings).toHaveLength(2)
    expect(readings.map((reading) => reading.revision)).toEqual([2, 1])
    expect(readings[0]!.parts[0]!.reached).toBe(9)
    expect(readings[1]!.parts[0]!.reached).toBe(4)
  })

  it("keeps two pages apart", () => {
    const readings = revisionReadings([
      tally("n_a", { views: 3, reached: 3 }),
      tally("n_a", { treeId: other, views: 8, reached: 8 }),
    ])

    expect(pageReadings(readings).map((page) => page.treeId)).toEqual([treeId, other])
  })

  it("puts the part most people saw first and the part fewest saw last", () => {
    const reading = readingOf([
      tally("n_bottom", { views: 20, reached: 2 }),
      tally("n_top", { views: 20, reached: 20 }),
      tally("n_middle", { views: 20, reached: 11 }),
    ])

    expect(reading.parts.map((part) => part.nodeId)).toEqual(["n_top", "n_middle", "n_bottom"])
  })

  /**
   * The same counters twice must produce the same list. A screenshot of a
   * shuffling order is not evidence of anything.
   */
  it("orders two parts nobody has seen the same way every time", () => {
    const parts = () => readingOf([tally("n_b"), tally("n_a")]).parts.map((part) => part.nodeId)

    expect(parts()).toEqual(["n_a", "n_b"])
    expect(parts()).toEqual(parts())
  })

  it("reports the most page views any one part was mentioned by", () => {
    const reading = readingOf([
      tally("n_a", { views: 40, reached: 40 }),
      tally("n_b", { views: 12, reached: 3 }),
    ])

    expect(reading.views).toBe(40)
  })
})

describe("naming a part a reader did something to", () => {
  const named: ReadonlyMap<string, PartName> = new Map([
    ["n_a", { name: "the card “Autumn arrivals”", nodeId: "n_a" }],
  ])

  it("names it out of the page being served when the part is still there", () => {
    expect(readingOf([tally("n_a", { views: 1 })], named).parts[0]!.name.name).toBe(
      "the card “Autumn arrivals”"
    )
  })

  /**
   * A tally outlives the revision it describes, so a part that has since been
   * removed has no node left to read words out of. The registered type is all
   * that is known and the noun inside it is the honest plain reading — never
   * `loom.card` on the surface.
   */
  it("falls back to the noun in the registered type when the part is gone", () => {
    const part = readingOf([tally("n_gone", { type: "loom.card", views: 1 })], named).parts[0]!

    expect(part.name.name).toBe("the card")
    expect(part.name.name).not.toContain("loom.")
  })

  it("reads a host's own namespaced, hyphenated type as words", () => {
    expect(readingOf([tally("n_x", { type: "acme.buy-button", views: 1 })]).parts[0]!.name.name).toBe(
      "the buy button"
    )
  })

  it("keeps the registered type on the reading, for the disclosure", () => {
    expect(readingOf([tally("n_x", { type: "acme.buy-button", views: 1 })]).parts[0]!.type).toBe(
      "acme.buy-button"
    )
  })

  it("keeps the id beside the name", () => {
    expect(readingOf([tally("n_a", { views: 1 })], named).parts[0]!.name.nodeId).toBe("n_a")
  })
})

describe("the five things worth saying out loud", () => {
  it("names the part fewest people got to", () => {
    const reading = readingOf([
      tally("n_top", { views: 20, reached: 20 }),
      tally("n_foot", { views: 20, reached: 3 }),
    ])

    expect(highlightsOf(reading).fewestSaw?.nodeId).toBe("n_foot")
  })

  /**
   * Pointing at a part that is doing nothing wrong is worse than saying
   * nothing. Every part reached equally has no laggard, and one part on its own
   * is the same case.
   */
  it("names no laggard when every part was seen the same number of times", () => {
    const reading = readingOf([
      tally("n_a", { views: 9, reached: 9 }),
      tally("n_b", { views: 9, reached: 9 }),
    ])

    expect(highlightsOf(reading).fewestSaw).toBeUndefined()
  })

  it("names no laggard when there is only one part", () => {
    expect(highlightsOf(readingOf([tally("n_a", { views: 9, reached: 9 })])).fewestSaw).toBeUndefined()
  })

  /**
   * Total dwell rewards whatever the most people saw, which is the top of the
   * page every time. "People stayed longest here" that always answers *the
   * heading* is a sentence carrying no information.
   */
  it("measures where people stayed longest per person, not in total", () => {
    const reading = readingOf([
      tally("n_top", { views: 100, reached: 100, dwellMs: 100_000 }),
      tally("n_deep", { views: 100, reached: 5, dwellMs: 50_000 }),
    ])

    expect(highlightsOf(reading).longest?.nodeId).toBe("n_deep")
    expect(dwellEach(reading.parts[0]!)).toBe(1_000)
  })

  it("names what was clicked most and what was opened most", () => {
    const reading = readingOf([
      tally("n_buy", { views: 30, reached: 20, activations: 14 }),
      tally("n_details", { views: 30, reached: 18, opens: 9, closes: 4 }),
    ])

    const highlights = highlightsOf(reading)

    expect(highlights.mostClicked?.nodeId).toBe("n_buy")
    expect(highlights.mostOpened?.nodeId).toBe("n_details")
  })

  /**
   * Nothing clicked is a real answer. It is absent here so the screen can say
   * it in words rather than print a part with a zero beside it, which reads as
   * a part that failed.
   */
  it("names nothing when nobody clicked or opened anything", () => {
    const highlights = highlightsOf(readingOf([tally("n_a", { views: 4, reached: 4 })]))

    expect(highlights.mostClicked).toBeUndefined()
    expect(highlights.mostOpened).toBeUndefined()
    expect(highlights.longest).toBeUndefined()
  })

  it("has nothing to say about a revision with no parts", () => {
    const empty: RevisionReading = { treeId, revision: 1, views: 0, parts: [] }

    expect(highlightsOf(empty)).toEqual({})
  })
})

describe("before and after a change", () => {
  const before = readingOf([
    tally("n_kept", { revision: 1, views: 50, reached: 10 }),
    tally("n_dropped", { revision: 1, views: 50, reached: 40 }),
  ])
  const after = revisionReadings([
    tally("n_kept", { revision: 2, views: 40, reached: 32 }),
    tally("n_new", { revision: 2, views: 40, reached: 20 }),
  ])[0]!

  it("compares only the parts both revisions heard about", () => {
    expect(reachShifts(before, after).map((shift) => shift.nodeId)).toEqual(["n_kept"])
  })

  it("carries both counts and both denominators, because the two windows are different sizes", () => {
    const [shift] = reachShifts(before, after)

    expect(shift?.before).toEqual({ reached: 10, views: 50 })
    expect(shift?.after).toEqual({ reached: 32, views: 40 })
    expect(rateOf(shift!.before)).toBeCloseTo(0.2)
  })

  it("reads a rise in words", () => {
    expect(plainShift(reachShifts(before, after)[0]!)).toBe("up 60 points")
  })

  it("reads a fall in words", () => {
    const fell = reachShifts(after, before)[0]!

    expect(shiftOf(fell)).toBeLessThan(0)
    expect(plainShift(fell)).toBe("down 60 points")
  })

  /** Found in a screenshot: `down 1 points`, on the first picture taken of this screen. */
  it("counts one point as a point rather than as 1 points", () => {
    const barely = reachShifts(
      revisionReadings([tally("n_a", { revision: 1, views: 100, reached: 50 })])[0]!,
      revisionReadings([tally("n_a", { revision: 2, views: 100, reached: 49 })])[0]!
    )[0]!

    expect(plainShift(barely)).toBe("down 1 point")
  })

  it("says so rather than rounding a standstill to zero points", () => {
    const flat = reachShifts(
      readingOf([tally("n_a", { revision: 1, views: 10, reached: 5 })]),
      revisionReadings([tally("n_a", { revision: 2, views: 20, reached: 10 })])[0]!
    )[0]!

    expect(plainShift(flat)).toBe("about the same")
  })

  /**
   * A part nobody was heard from about is not a fall to nothing. Dividing by
   * its absent denominator would print a collapse that never happened.
   */
  it("leaves out a part with no views in either window", () => {
    const silent = revisionReadings([tally("n_kept", { revision: 2, views: 0, reached: 0 })])[0]!

    expect(reachShifts(before, silent)).toEqual([])
  })

  it("puts the biggest movement first, whichever way it moved", () => {
    const was = revisionReadings([
      tally("n_small", { revision: 1, views: 10, reached: 5 }),
      tally("n_big", { revision: 1, views: 10, reached: 9 }),
    ])[0]!
    const now = revisionReadings([
      tally("n_small", { revision: 2, views: 10, reached: 6 }),
      tally("n_big", { revision: 2, views: 10, reached: 1 }),
    ])[0]!

    expect(reachShifts(was, now).map((shift) => shift.nodeId)).toEqual(["n_big", "n_small"])
  })
})

describe("saying a measurement out loud", () => {
  it.each([
    [0, "under a second"],
    [999, "under a second"],
    [1_000, "about 1 second"],
    [1_400, "about 1 second"],
    [12_300, "about 12 seconds"],
    [59_400, "about 59 seconds"],
    [60_000, "about 1 minute"],
    [4_000_000, "about 1 hour"],
    [9_000_000, "about 3 hours"],
  ])("reads %ims as %s", (ms, words) => {
    expect(plainDuration(ms)).toBe(words)
  })

  it("never says a millisecond", () => {
    expect(plainDuration(12_345)).not.toContain("ms")
  })

  /**
   * Two of two and two hundred of two hundred are not the same news, and a
   * percentage would make the smallest sample in the portal look like the
   * strongest evidence in it.
   */
  it("says a count against the visits it is a count of, never a percentage", () => {
    expect(outOfVisits(3, 40)).toBe("3 of the 40 visits")
    expect(outOfVisits(1, 1)).toBe("1 of the 1 visit")
    expect(outOfVisits(2, 2)).not.toContain("%")
  })
})
