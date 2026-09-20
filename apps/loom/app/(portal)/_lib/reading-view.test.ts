import { describe, expect, it } from "vitest"

import { nodeIdSchema, primitiveTypeSchema, treeIdSchema } from "@loom/runtime"
import type { StoredTally } from "@loom/runtime/signals"

import type { PartName } from "./part-name"
import {
  dwellEach,
  highlightsOf,
  outOfReaders,
  outOfVisits,
  pageReadings,
  pageUse,
  plainDuration,
  plainShift,
  rateOf,
  reachShifts,
  revisionReadings,
  shiftOf,
  unplacedUse,
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
  engaged: counts.engaged ?? 0,
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

/**
 * The counter that is about a region.
 *
 * A press lands on a button, so `activations` on a band is zero however busy
 * the band was, and until this was read a section's row on this screen was time
 * on screen beside three permanent zeroes. Every case below is about one of the
 * two ways a screen can lie with it: by dividing by a denominator that is not
 * one, or by reading a silence as a nobody.
 */
describe("what readers used, rather than what they saw", () => {
  it("carries each part's own use through the grouping", () => {
    const reading = readingOf([tally("n_band", { views: 4, reached: 4, engaged: 3 })])

    expect(reading.parts[0]!.engaged).toBe(3)
  })

  /**
   * A view that used something inside a part is a page view, and a region is
   * credited with it without being credited with a `views` of its own. Two
   * readers who each pressed a different button, whose senders reported nothing
   * else, are two page views that the old floor read as one.
   */
  it("raises the page-view floor to take in a view that only ever used something", () => {
    const reading = readingOf([
      tally("n_one", { views: 1, reached: 1 }),
      tally("n_two", { views: 1, reached: 1 }),
      tally("n_page", { engaged: 2 }),
    ])

    expect(reading.views).toBe(2)
  })

  it("never reports a page-view floor below the uses it is the denominator of", () => {
    const reading = readingOf([tally("n_page", { views: 0, reached: 0, engaged: 9 })])

    expect(reading.views).toBeGreaterThanOrEqual(pageUse(reading)!.whole)
  })
})

describe("the page as a whole, and the part that saw the most of it", () => {
  /**
   * A delegated signal names every region it happened inside, up to and
   * including the root — so the largest use on a revision is not an estimate of
   * anything. It is the views in which somebody used something, anywhere.
   */
  it("reads the whole page's use off the largest one, which is the root's", () => {
    const reading = readingOf([
      tally("n_page", { views: 40, reached: 40, engaged: 20 }),
      tally("n_band", { views: 40, reached: 18, engaged: 12 }),
      tally("n_buy", { views: 40, reached: 18, activations: 14 }),
    ])

    expect(pageUse(reading)!.whole).toBe(20)
  })

  it("names the most-used part that is not simply the page itself", () => {
    const reading = readingOf([
      tally("n_page", { views: 40, reached: 40, engaged: 20 }),
      tally("n_band", { views: 40, reached: 18, engaged: 12 }),
      tally("n_foot", { views: 40, reached: 6, engaged: 2 }),
    ])

    expect(pageUse(reading)!.region!.part.nodeId).toBe("n_band")
    expect(pageUse(reading)!.region!.used).toBe(12)
    expect(pageUse(reading)!.region!.outOf).toBe(18)
  })

  /**
   * A part whose use is indistinguishable from the whole page's is not news
   * about a part. One band that everybody who did anything did it in is the
   * page, said twice.
   */
  it("names no region when every part that was used was used by every view the page was", () => {
    const reading = readingOf([
      tally("n_page", { views: 9, reached: 9, engaged: 4 }),
      tally("n_band", { views: 9, reached: 9, engaged: 4 }),
    ])

    expect(pageUse(reading)!.whole).toBe(4)
    expect(pageUse(reading)!.region).toBeUndefined()
  })

  /**
   * Ranked on the count rather than on the share. A share would put a band
   * reached once and used once above everything else on the page, which is the
   * small-sample confidence this module refuses everywhere else.
   */
  it("ranks a region on how many visits used it, not on the share of its own readers", () => {
    const reading = readingOf([
      tally("n_page", { views: 40, reached: 40, engaged: 20 }),
      tally("n_tiny", { views: 40, reached: 1, engaged: 1 }),
      tally("n_band", { views: 40, reached: 30, engaged: 12 }),
    ])

    expect(pageUse(reading)!.region!.part.nodeId).toBe("n_band")
  })

  it("breaks a tie on reach and then on id, so the same counters name the same part twice", () => {
    const tallies = [
      tally("n_page", { views: 9, reached: 9, engaged: 5 }),
      tally("n_b", { views: 9, reached: 4, engaged: 3 }),
      tally("n_a", { views: 9, reached: 4, engaged: 3 }),
    ]

    expect(pageUse(readingOf(tallies))!.region!.part.nodeId).toBe("n_a")
    expect(pageUse(readingOf([...tallies].reverse()))!.region!.part.nodeId).toBe("n_a")
  })

  it("offers no denominator for a region nobody reported on screen", () => {
    const reading = readingOf([
      tally("n_page", { views: 9, reached: 9, engaged: 5 }),
      tally("n_band", { engaged: 4 }),
    ])

    expect(pageUse(reading)!.region!.used).toBe(4)
    expect(pageUse(reading)!.region!.outOf).toBeUndefined()
  })

  it("offers no denominator for a region used by more views than reported seeing it", () => {
    const reading = readingOf([
      tally("n_page", { views: 9, reached: 9, engaged: 5 }),
      tally("n_band", { views: 9, reached: 2, engaged: 4 }),
    ])

    expect(pageUse(reading)!.region!.outOf).toBeUndefined()
  })

  it("has nothing to say about a page nobody used", () => {
    const reading = readingOf([tally("n_hero", { views: 9, reached: 9, dwellMs: 900 })])

    expect(pageUse(reading)).toBeUndefined()
  })
})

describe("presses that arrived with nowhere to put them", () => {
  it("adds up the clicks and openings no part heard about", () => {
    const reading = readingOf([
      tally("n_buy", { views: 6, reached: 5, activations: 7 }),
      tally("n_terms", { views: 6, reached: 4, opens: 2, closes: 1 }),
    ])

    expect(unplacedUse(reading)).toEqual({ uses: 10 })
  })

  /**
   * Every region up to the root is credited, so one placed press anywhere makes
   * this impossible. A zero is then the readers rather than the sender.
   */
  it("says nothing when a single press was placed", () => {
    const reading = readingOf([
      tally("n_page", { engaged: 1 }),
      tally("n_buy", { views: 6, reached: 5, activations: 7 }),
    ])

    expect(unplacedUse(reading)).toBeUndefined()
  })

  it("says nothing about a page nobody used, which is not the same news", () => {
    const reading = readingOf([tally("n_hero", { views: 6, reached: 6, dwellMs: 600 })])

    expect(unplacedUse(reading)).toBeUndefined()
  })

  it("is never both this and a use of the page, on any reading", () => {
    for (const reading of [
      readingOf([tally("n_buy", { views: 2, reached: 2, activations: 1 })]),
      readingOf([tally("n_page", { views: 2, reached: 2, engaged: 1 })]),
      readingOf([tally("n_hero", { views: 2, reached: 2 })]),
    ]) {
      expect([pageUse(reading), unplacedUse(reading)].filter(Boolean).length).toBeLessThan(2)
    }
  })
})

describe("a count against the visits that got that far", () => {
  it("names the population it is measured against", () => {
    expect(outOfReaders(5, 12)).toBe("5 of the 12 visits that got that far")
  })

  it("counts one visit as a visit", () => {
    expect(outOfReaders(1, 1)).toBe("1 of the 1 visit that got that far")
  })

  /**
   * The same numerator against two populations is opposite news, which is why
   * this is a second sentence rather than a second argument.
   */
  it("is never confused with a count against every visit", () => {
    expect(outOfReaders(5, 12)).not.toBe(outOfVisits(5, 12))
  })
})
