import { describe, expect, it } from "vitest"

import { nodeIdSchema, primitiveTypeSchema, treeIdSchema } from "@jam-overture/loom"
import type { StoredTally } from "@jam-overture/loom/signals"

import { runtimeWordsIn } from "../_test/plain-language"
import type { PartName } from "./part-name"
import {
  comparisonOf,
  countingStanding,
  dwellEach,
  highlightsOf,
  outOfReaders,
  outOfVisits,
  pageReadings,
  plainDuration,
  plainShift,
  rateOf,
  reachShifts,
  revisionReadings,
  shiftOf,
  standingAdvice,
  standingNote,
  visitsHeard,
  type CountingStanding,
  type PageReading,
  type RevisionReading,
} from "./reading-view"

const treeId = treeIdSchema.parse("t_1")
const other = treeIdSchema.parse("t_2")

const tally = (
  nodeId: string,
  counts: Partial<Omit<StoredTally, "treeId" | "revision" | "nodeId" | "type">> & {
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
  completions: counts.completions ?? 0,
  updatedAt: counts.updatedAt ?? "2026-09-15T00:00:00.000Z",
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

  /**
   * **What was pressed most and what was opened most left this reading**, for
   * `_lib/doing.ts`, and the two tests that pinned them went with them. The
   * reason is the altitude rather than the arithmetic: everything else here is
   * about what readers *saw*, those two are about what they *did*, and the card
   * drew them three lines apart from the headcount they belong under with
   * *people stayed longest on the introduction* sitting in between.
   *
   * What stays pinned here is that this reading says nothing about either, so a
   * refactor that put them back would have to delete this test to do it.
   */
  it("says nothing about what was pressed or opened, which is another reading's", () => {
    const highlights = highlightsOf(
      readingOf([
        tally("n_buy", { views: 30, reached: 20, dwellMs: 20_000, activations: 14 }),
        tally("n_details", { views: 30, reached: 18, dwellMs: 1_000, opens: 9, closes: 4 }),
      ])
    )

    expect(Object.keys(highlights).sort()).toEqual(["fewestSaw", "longest"])
  })

  /**
   * Nothing seen for any longer than anything else is a real answer. It is
   * absent here so the screen can say it in words rather than print a part with
   * a zero beside it, which reads as a part that failed.
   */
  it("names nothing when every part was seen for as long as every other", () => {
    const highlights = highlightsOf(readingOf([tally("n_a", { views: 4, reached: 4 })]))

    expect(highlights.longest).toBeUndefined()
    expect(highlights.fewestSaw).toBeUndefined()
  })

  it("has nothing to say about a revision with no parts", () => {
    const empty: RevisionReading = {
      treeId,
      revision: 1,
      countedAt: "2026-09-15T00:00:00.000Z",
      views: 0,
      parts: [],
    }

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

    expect(reading.views).toBeGreaterThanOrEqual(reading.parts[0]!.engaged)
  })
})

/*
 * **`pageUse` and `unplacedUse` were tested here, in two describes of fourteen
 * tests, and both readings have gone to `_lib/doing.ts`.**
 *
 * Every property they pinned is pinned there, off `pageActionOf`: the page-wide
 * headcount, the region below it, the ranking by count rather than by share,
 * the deterministic tie, the region with no denominator of its own, the page
 * nobody used, the presses with nowhere to go, and the rule that a reading is
 * never both at once. Three of them say something different now and each says
 * so in its own comment — the headcount is the root's own row rather than a
 * maximum over rows, the tie breaks on reading order rather than on an
 * identifier, and a region whose engagement equals the whole page's is named
 * rather than withheld.
 */

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

describe("when these numbers were last added up", () => {
  it("reports the newest rollup across a version's parts, not the oldest", () => {
    const reading = readingOf([
      tally("n_a", { views: 4, updatedAt: "2026-09-14T09:00:00.000Z" }),
      tally("n_b", { views: 4, updatedAt: "2026-09-15T11:30:00.000Z" }),
      tally("n_c", { views: 4, updatedAt: "2026-09-15T08:00:00.000Z" }),
    ])

    expect(reading.countedAt).toBe("2026-09-15T11:30:00.000Z")
  })

  /**
   * Two versions of one page are counted in different runs, and a screen that
   * reported one version's moment against the other would be aging or
   * freshening a figure by a whole window.
   */
  it("keeps each version's moment to itself", () => {
    const readings = revisionReadings([
      tally("n_a", { revision: 1, views: 4, updatedAt: "2026-09-14T09:00:00.000Z" }),
      tally("n_a", { revision: 2, views: 4, updatedAt: "2026-09-15T09:00:00.000Z" }),
    ])

    expect(readings.map((reading) => reading.countedAt)).toEqual([
      "2026-09-15T09:00:00.000Z",
      "2026-09-14T09:00:00.000Z",
    ])
  })

  it("keeps each page's moment to itself when several arrive in one read", () => {
    const readings = revisionReadings([
      tally("n_a", { views: 4, updatedAt: "2026-09-14T09:00:00.000Z" }),
      tally("n_a", { treeId: other, views: 4, updatedAt: "2026-09-15T09:00:00.000Z" }),
    ])

    expect(new Map(readings.map((reading) => [reading.treeId, reading.countedAt]))).toEqual(
      new Map([
        [treeId, "2026-09-14T09:00:00.000Z"],
        [other, "2026-09-15T09:00:00.000Z"],
      ])
    )
  })
})

describe("whether these numbers are about the page being served", () => {
  const countedAt = (revisions: readonly number[]): PageReading => ({
    treeId,
    revisions: revisions.map((revision) => readingOf([tally("n_a", { revision, views: 4 })])),
  })

  it("says so when the newest counted version is the one being served", () => {
    expect(countingStanding(countedAt([4]), 4)).toEqual({ kind: "current", counted: 4 })
  })

  /**
   * The state of every page for as long as an hour after somebody works on it,
   * and the one a reader is most likely to arrive in — they came here *because*
   * they made the change.
   */
  it("says how far behind the counters are when the page has moved on", () => {
    expect(countingStanding(countedAt([4]), 6)).toEqual({
      kind: "behind",
      counted: 4,
      live: 6,
      changes: 2,
    })
  })

  /**
   * A failed read of the page reported as "current" would be the confident
   * claim this whole surface refuses to make. It is a state of its own.
   */
  it("refuses to call the counters current when the page could not be read", () => {
    expect(countingStanding(countedAt([4]), undefined)).toEqual({ kind: "unread", counted: 4 })
  })

  /**
   * A revision only climbs, so a page older than its own counters means
   * something put a different page at this address. Falling through to
   * `current` would print *these are the numbers for the version you are
   * serving* over numbers about a page that is gone.
   */
  it("tells a replaced page apart from an unreadable one", () => {
    expect(countingStanding(countedAt([4]), 1)).toEqual({ kind: "replaced", counted: 4, live: 1 })
  })

  it("asks about the newest counted version rather than the oldest", () => {
    expect(countingStanding(countedAt([4, 3, 2]), 4)).toEqual({ kind: "current", counted: 4 })
  })
})

describe("what can honestly be said about before and after", () => {
  const pageOf = (tallies: readonly StoredTally[]): PageReading =>
    pageReadings(revisionReadings(tallies))[0]!

  const TWO = [
    tally("n_kept", { revision: 1, views: 50, reached: 10 }),
    tally("n_kept", { revision: 2, views: 40, reached: 32 }),
  ]

  it("compares the newest counted version against the one before it", () => {
    const comparison = comparisonOf(pageOf(TWO))

    expect(comparison.kind).toBe("shifts")
    expect(comparison.kind === "shifts" && comparison.before).toBe(1)
    expect(comparison.kind === "shifts" && comparison.after).toBe(2)
    expect(comparison.kind === "shifts" && comparison.shifts).toHaveLength(1)
  })

  /**
   * The failure this reading exists for: all three of these used to be an
   * absent section, and a reader cannot tell three facts apart from one blank.
   */
  it("says there is nothing before it rather than nothing at all", () => {
    expect(comparisonOf(pageOf([tally("n_a", { revision: 2, views: 4, reached: 4 })]))).toEqual({
      kind: "first",
      counted: 2,
    })
  })

  it("tells a change that replaced every reported part apart from a change that moved nothing", () => {
    const comparison = comparisonOf(
      pageOf([
        tally("n_gone", { revision: 1, views: 50, reached: 10 }),
        tally("n_new", { revision: 2, views: 40, reached: 32 }),
      ])
    )

    expect(comparison).toEqual({ kind: "nothing-shared", before: 1, after: 2 })
  })

  /**
   * A part nobody reported on in one of the two versions is not comparable, and
   * a version pair left with none of them is `nothing-shared` rather than an
   * empty list of shifts — which is the arm that would have brought the silent
   * section back.
   */
  it("never answers with an empty list of shifts", () => {
    const comparison = comparisonOf(
      pageOf([
        tally("n_kept", { revision: 1, views: 0, reached: 0 }),
        tally("n_kept", { revision: 2, views: 40, reached: 32 }),
      ])
    )

    expect(comparison.kind).toBe("nothing-shared")
  })
})

describe("saying which version these numbers are about, out loud", () => {
  const reading = readingOf([tally("n_a", { revision: 2, views: 40, reached: 40 })])
  const one = readingOf([tally("n_a", { revision: 2, views: 1, reached: 1 })])

  const current: CountingStanding = { kind: "current", counted: 2 }
  const behind: CountingStanding = { kind: "behind", counted: 2, live: 3, changes: 1 }
  const twice: CountingStanding = { kind: "behind", counted: 2, live: 4, changes: 2 }
  const thrice: CountingStanding = { kind: "behind", counted: 2, live: 5, changes: 3 }
  const unread: CountingStanding = { kind: "unread", counted: 2 }
  const replaced: CountingStanding = { kind: "replaced", counted: 2, live: 1 }

  it("keeps the sentence it always had when the counters are the page being served", () => {
    expect(visitsHeard(reading, current)).toBe(
      "40 visits to this page have reported back since it was last changed. That is version 2."
    )
  })

  /**
   * The defect, in the form it reached a reader: *since it was last changed* is
   * a claim that the counted version is the current one, and on a page changed
   * ten minutes ago the visits reported back **before** the last change.
   */
  it("stops claiming the visits arrived since the last change when they did not", () => {
    expect(visitsHeard(reading, behind)).toBe(
      "40 visits have reported back on version 2 of this page."
    )
    expect(visitsHeard(reading, behind)).not.toContain("since it was last changed")
  })

  it("makes no claim either way when the page could not be read", () => {
    expect(visitsHeard(reading, unread)).not.toContain("since it was last changed")
  })

  it("counts one visit as a visit rather than as 1 visits, in both forms", () => {
    expect(visitsHeard(one, current)).toContain("One visit to this page has reported back")
    expect(visitsHeard(one, behind)).toBe("One visit has reported back on version 2 of this page.")
  })

  /**
   * `current` says so rather than saying nothing. Silence is what the other
   * three looked like until today, and it is also the sentence somebody wants
   * when they have *not* just made a change: the one saying the screen is live.
   */
  it("has a sentence for every standing, including the good one", () => {
    for (const standing of [current, behind, unread, replaced]) {
      expect(standingNote(standing).length, standing.kind).toBeGreaterThan(0)
    }
  })

  it("names the version that has nothing counted for it yet", () => {
    expect(standingNote(behind)).toContain("nothing has been counted for version 3 yet")
  })

  it("says how many changes have landed since, the way somebody would say it", () => {
    expect(standingNote(behind)).toContain("changed this page once since then")
    expect(standingNote(twice)).toContain("changed this page twice since then")
    expect(standingNote(thrice)).toContain("changed this page 3 times since then")
  })

  it("says the page being served is older rather than calling it unreadable", () => {
    expect(standingNote(replaced)).toContain("version 1")
    expect(standingNote(unread)).toContain("couldn’t read the page itself")
  })

  /**
   * Every screen answers "what do I do now?", and for the common case the
   * honest answer is *nothing, wait* — which has to be said, because a person
   * who has just made a change and found nothing about it will go looking for a
   * fault in their page instead.
   */
  it("tells a reader whose change is not counted yet that there is nothing to fix", () => {
    expect(standingAdvice(behind)).toContain("nothing to fix")
    expect(standingAdvice(behind)).toContain("about an hour")
  })

  it("has advice for every standing that is news, and none for the one that is not", () => {
    expect(standingAdvice(current)).toBeUndefined()
    for (const standing of [behind, unread, replaced]) {
      expect(standingAdvice(standing), standing.kind).toBeDefined()
    }
  })

  /**
   * The plain-language rule, on every sentence this screen shows unasked.
   *
   * `revision` used to be exempted here at the point of use, on the reasoning
   * that it was the portal's own word on every other screen — `/portal/history`
   * numbered its rows *Revision 4* and `RevisionLink` addressed them — so a
   * blanket ban would have the rule enforcing an inconsistency. That was true
   * of the inconsistency and wrong about which side to resolve it on: the
   * portal already had a plain word for the number and was using it a screen
   * away. These sentences say *version 12* now, `_lib/version.ts` is where the
   * word is written once, and **the exemption is gone** — there is nothing
   * from the runtime's vocabulary left to allow through.
   */
  it("says all of it without the runtime's vocabulary", () => {
    for (const standing of [current, behind, unread, replaced]) {
      const said = `${visitsHeard(reading, standing)} ${standingNote(standing)} ${standingAdvice(standing) ?? ""}`

      expect(runtimeWordsIn(said), said).toEqual([])
    }
  })
})
