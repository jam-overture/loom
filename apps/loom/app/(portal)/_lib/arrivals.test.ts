import { describe, expect, it } from "vitest"

import {
  nodeIdSchema,
  primitiveTypeSchema,
  treeIdSchema,
  type ElementNode,
  type LoomNode,
  type LoomTree,
} from "@jam-overture/loom"
import {
  pageReachOf,
  pageReadingOf,
  REACH_SILENCES,
  type ReaderTally,
  type StoredPageViews,
} from "@jam-overture/loom/signals"

import { runtimeWordsIn } from "../_test/plain-language"

import {
  aboutReaders,
  arrivalsOf,
  arrivalsSummary,
  cannotBeAShare,
  countsAreExact,
  countsAreGenerous,
  gotThisFar,
  readersAt,
  readersCount,
  stillArriving,
  type PageArrivals,
} from "./arrivals"
import { namesInTree } from "./part-name"
import { readingOf } from "./vocabulary"

const nodeId = (id: string) => nodeIdSchema.parse(id)
const type = (value: string) => primitiveTypeSchema.parse(value)

const TREE = treeIdSchema.parse("t_seed1")

const text = (id: string, value: string): LoomNode => ({ kind: "text", id: nodeId(id), value })

const element = (
  id: string,
  primitive: string,
  children: readonly LoomNode[] = []
): ElementNode => ({
  kind: "element",
  id: nodeId(id),
  type: type(primitive),
  props: {},
  children,
})

const PAGE: LoomTree = {
  schemaVersion: 1,
  treeId: TREE,
  revision: 4,
  root: element("n_page", "loom.page", [
    element("n_hero", "loom.card", [text("n_herowords", "Autumn arrivals")]),
    element("n_band", "loom.card", [text("n_bandwords", "What it costs")]),
    element("n_foot", "loom.card", [text("n_footwords", "The small print")]),
  ]),
}

const DECLARED = { copyFor: () => undefined, typesWithRole: () => [] }

const tally = (id: string, counters: Partial<ReaderTally> = {}): ReaderTally => ({
  treeId: counters.treeId ?? TREE,
  revision: counters.revision ?? 4,
  nodeId: nodeId(id),
  type: type(counters.type ?? "loom.card"),
  views: counters.views ?? 0,
  reached: counters.reached ?? 0,
  engaged: counters.engaged ?? 0,
  dwellMs: counters.dwellMs ?? 0,
  activations: counters.activations ?? 0,
  opens: counters.opens ?? 0,
  closes: counters.closes ?? 0,
  completions: counters.completions ?? 0,
})

const door = (row: Partial<StoredPageViews> = {}): StoredPageViews => ({
  treeId: row.treeId ?? TREE,
  revision: row.revision ?? 4,
  opened: row.opened ?? 0,
  appearances: row.appearances ?? 0,
  updatedAt: row.updatedAt ?? "2026-10-07T09:00:00.000Z",
})

const reading = (
  tallies: readonly ReaderTally[],
  rows: readonly StoredPageViews[]
): PageArrivals =>
  arrivalsOf(
    pageReachOf(pageReadingOf(PAGE, tallies, DECLARED), rows),
    namesInTree(PAGE)
  )

/**
 * A page read through, with nobody's visit spanning a counting window: thirty
 * arrivals, thirty appearances, and the reach falling off down the page.
 */
const READ_THROUGH: readonly ReaderTally[] = [
  tally("n_page", { views: 30, reached: 30 }),
  tally("n_hero", { views: 30, reached: 27 }),
  tally("n_band", { views: 30, reached: 19 }),
  tally("n_foot", { views: 30, reached: 6 }),
]

/** The same page, where a third of the visits were counted in two windows. */
const STRADDLED = door({ opened: 30, appearances: 40 })

const EXACTLY = door({ opened: 30, appearances: 30 })

describe("the reading", () => {
  it("carries the exact arrivals rather than the floor the counters give", () => {
    const arrivals = reading(READ_THROUGH, [EXACTLY])

    expect([arrivals.arrived, arrivals.floor]).toEqual([30, 30])
  })

  /**
   * The whole point of the join, in one assertion. The floor is the largest
   * `views` any single row reports and is untouched by the arrivals; the
   * arrivals are counted once at the door and cannot be inflated by a window
   * boundary. A deployment whose readers straddle has two different numbers
   * here, and the screen has only ever had the first.
   */
  it("keeps the floor and the arrivals apart when they differ", () => {
    const arrivals = reading(READ_THROUGH, [STRADDLED])

    expect(arrivals.floor).toBe(30)
    expect(arrivals.arrived).toBe(30)
    expect(arrivals.counted).toBe(40)
    expect(arrivals.drift).toBe(10)
  })

  it("names every part of the page in reading order", () => {
    expect(reading(READ_THROUGH, [EXACTLY]).parts.map((part) => part.nodeId)).toEqual([
      "n_page",
      "n_hero",
      "n_band",
      "n_foot",
    ])
  })

  it("names a part by what it says rather than by what it is", () => {
    const hero = reading(READ_THROUGH, [EXACTLY]).parts.find(
      (part) => part.nodeId === "n_hero"
    )

    expect(hero?.name.name).toContain("Autumn arrivals")
  })

  /**
   * The ceiling is `reached ÷ opened` and the estimate is `reached ÷
   * appearances`, so on a straddled deployment the estimate is the smaller of
   * the two and the gap between them is the straddle seen per part.
   */
  it("puts a part's readers below its ceiling", () => {
    const band = reading(READ_THROUGH, [STRADDLED]).parts.find(
      (part) => part.nodeId === "n_band"
    )

    expect(band?.readers).toBeCloseTo((19 * 30) / 40)
    expect(band?.readers ?? 0).toBeLessThanOrEqual(band?.atMostReaders ?? 0)
  })

  it("says when nobody's visit spanned two windows, and when one did", () => {
    expect(reading(READ_THROUGH, [EXACTLY]).exact).toBe(true)
    expect(reading(READ_THROUGH, [STRADDLED]).exact).toBe(false)
  })
})

describe("the part fewest of them got to", () => {
  it("is the one with the smallest share, and it is named", () => {
    expect(reading(READ_THROUGH, [EXACTLY]).fewestGotTo?.nodeId).toBe("n_foot")
  })

  /**
   * The top of the page is in every visit that drew it, so its share is at or
   * near 1 on every healthy deployment. Naming it would be a sentence that is
   * always true and never useful.
   */
  it("is never the page itself", () => {
    const arrivals = reading(
      [tally("n_page", { views: 30, reached: 2 }), tally("n_hero", { views: 30, reached: 27 })],
      [EXACTLY]
    )

    expect(arrivals.parts[0]?.nodeId).toBe("n_page")
    expect(arrivals.fewestGotTo?.nodeId).toBe("n_hero")
  })

  /**
   * A part nobody reached has a share of nought, so it would win this on every
   * page that has one — and *nobody got to the small print* is a sentence
   * `_lib/skipped.ts` already says in a section of its own.
   */
  it("is never a part nobody got to at all", () => {
    const arrivals = reading(
      [
        tally("n_page", { views: 30, reached: 30 }),
        tally("n_hero", { views: 30, reached: 27 }),
        tally("n_band", { views: 30, reached: 19 }),
      ],
      [EXACTLY]
    )

    expect(arrivals.parts.find((part) => part.nodeId === "n_foot")?.reached).toBe(0)
    expect(arrivals.fewestGotTo?.nodeId).toBe("n_band")
  })

  /** A part with no reading cannot be the answer, however small its count is. */
  it("is absent when no part below the top has a reading", () => {
    expect(reading([tally("n_page", { views: 4, reached: 4 })], []).fewestGotTo).toBeUndefined()
  })
})

describe("how many people were there", () => {
  it("says the count, and says it against this version of the page", () => {
    expect(arrivalsSummary(reading(READ_THROUGH, [EXACTLY]))).toBe(
      "30 readers arrived at version 4 of this page."
    )
  })

  it("says one reader rather than 1 readers", () => {
    expect(arrivalsSummary(reading(READ_THROUGH, [door({ opened: 1, appearances: 1 })]))).toContain(
      "1 reader arrived"
    )
  })

  /**
   * Three nothings and three sentences. They render identically as silence and
   * mean entirely different things: nobody has counted the arrivals, nothing is
   * marking them, and nothing has been counted yet. Only the middle one is a
   * fault, and only the last one is worth coming back for.
   */
  it("tells the three nothings apart", () => {
    const unmeasured = arrivalsSummary(reading(READ_THROUGH, []))
    const unopened = arrivalsSummary(reading(READ_THROUGH, [door({ appearances: 12 })]))
    const uncounted = arrivalsSummary(reading([], [door({ opened: 9 })]))

    expect(unmeasured).toContain("Nothing has counted how many people arrived")
    expect(unopened).toContain("Nothing is saying when a visit to this page begins")
    expect(uncounted).toContain("no window of their reading has been counted yet")

    expect(new Set([unmeasured, unopened, uncounted]).size).toBe(3)
  })

  /**
   * The unmeasured arm is the one that has to say which figure it fell back to,
   * because it is the only one where the card still shows rates. A reader told
   * nothing would read a floor as a census, which is the state this whole
   * reading exists to end.
   */
  it("names the figure it fell back to when the arrivals were never counted", () => {
    expect(arrivalsSummary(reading(READ_THROUGH, []))).toContain("30")
  })

  it("has a sentence for every nothing the runtime can report", () => {
    for (const silence of REACH_SILENCES) {
      const said = arrivalsSummary({ ...reading(READ_THROUGH, [EXACTLY]), silence })

      expect([silence, said.length > 0]).toEqual([silence, true])
    }
  })
})

describe("the sentence this section exists for", () => {
  it("puts one part of the page in people", () => {
    const line = gotThisFar(reading(READ_THROUGH, [EXACTLY]))

    expect(readingOf(line!)).toContain("Of those 30, about 6 readers got as far as ")
    expect(readingOf(line!)).toContain("The small print")
    expect(readingOf(line!)).toContain("n_foot")
    expect(readingOf(line!)).toContain(
      "fewer than any other part of this page that anybody got to."
    )
  })

  it("rounds the readers to a whole person and says about", () => {
    const line = gotThisFar(reading(READ_THROUGH, [STRADDLED]))

    expect(readingOf(line!)).toContain("about 5 readers")
  })

  it("is absent where no part has a reading", () => {
    expect(gotThisFar(reading(READ_THROUGH, []))).toBeUndefined()
  })
})

describe("how generous the raw counts are", () => {
  it("measures the straddle as a share rather than arguing about it", () => {
    expect(countsAreGenerous(reading(READ_THROUGH, [STRADDLED]))).toContain("about 33% higher")
  })

  /**
   * Two states, two sentences, and neither is a blank. A deployment with no
   * over-count is the answer somebody who lengthened their counting window came
   * here to check.
   */
  it("says there is nothing to divide out rather than going quiet", () => {
    const arrivals = reading(READ_THROUGH, [EXACTLY])

    expect(countsAreGenerous(arrivals)).toBeUndefined()
    expect(countsAreExact(arrivals)).toContain("exact rather than an estimate")
  })

  it("claims neither under a nothing", () => {
    const arrivals = reading(READ_THROUGH, [])

    expect(countsAreGenerous(arrivals)).toBeUndefined()
    expect(countsAreExact(arrivals)).toBeUndefined()
  })
})

describe("the two figures this reading refuses", () => {
  /**
   * A share has no number of people on it while any arrival is waiting to be
   * counted, because applying the rate of the visits that have been counted to
   * the visits that have not would answer a question about people nobody
   * measured. The share is still given; the count is not.
   */
  it("withholds a count of people while an arrival is still waiting", () => {
    const arrivals = reading(READ_THROUGH, [door({ opened: 40, appearances: 30 })])
    const band = arrivals.parts.find((part) => part.nodeId === "n_band")

    expect(arrivals.pending).toBe(10)
    expect(band?.share).toBeCloseTo(19 / 30)
    expect(band?.readers).toBeUndefined()
    expect(stillArriving(arrivals)).toContain("has not been counted yet")
    expect(gotThisFar(arrivals)).toBeUndefined()
  })

  /**
   * More reach than there were arrivals cannot come from rows one set of
   * roll-ups wrote. It is counters older than the arrival count, it clears
   * itself, and a share above 1 is the one figure this screen must never draw.
   */
  it("refuses a share for a part that reports more visits than there were people", () => {
    const arrivals = reading(
      [tally("n_page", { views: 30, reached: 30 }), tally("n_band", { views: 30, reached: 44 })],
      [EXACTLY]
    )
    const band = arrivals.parts.find((part) => part.nodeId === "n_band")

    expect(arrivals.unreconciled).toEqual(["n_band"])
    expect(band?.readers).toBeUndefined()
    expect(band?.reached).toBe(44)
    expect(cannotBeAShare(arrivals)).toContain("clears itself")
  })

  it("says nothing about either when neither has happened", () => {
    const arrivals = reading(READ_THROUGH, [EXACTLY])

    expect(stillArriving(arrivals)).toBeUndefined()
    expect(cannotBeAShare(arrivals)).toBeUndefined()
  })
})

describe("what a row of the list may say", () => {
  it("gives a part's readers their denominator", () => {
    const arrivals = reading(READ_THROUGH, [EXACTLY])
    const band = arrivals.parts.find((part) => part.nodeId === "n_band")!

    expect(readersAt(band, arrivals)).toBe("about 19 of the 30 readers")
  })

  /**
   * Absent rather than blank wherever the honest figure cannot be given, so the
   * caller falls back to the figure the row has always carried. A true sentence
   * about a floor is worth more to a reader than nothing at all, as long as
   * something says which they are looking at.
   */
  it("is absent wherever the honest figure cannot be given", () => {
    const arrivals = reading(READ_THROUGH, [])
    const band = arrivals.parts.find((part) => part.nodeId === "n_band")!

    expect(readersAt(band, arrivals)).toBeUndefined()
  })
})

describe("counting people out loud", () => {
  it.each([
    [0, "about 0 readers"],
    [0.4, "about 0 readers"],
    [1, "about 1 reader"],
    [1.4, "about 1 reader"],
    [5.6, "about 6 readers"],
    [199.5, "about 200 readers"],
  ])("says %s as %s", (readers, said) => {
    expect(aboutReaders(readers)).toBe(said)
  })

  it.each([
    [0, "0 readers"],
    [1, "1 reader"],
    [2, "2 readers"],
  ])("says %s arrivals as %s", (count, said) => {
    expect(readersCount(count)).toBe(said)
  })
})

describe("the governing principle", () => {
  /**
   * > Plain language is the default. The technical record is one click away.
   * > Nothing is ever removed.
   *
   * Every sentence this module can hand a screen, over every state it can be
   * in. The words this one is most at risk of leaking are `revision` — the
   * summary says which version the count is about — and `fold`, which is what
   * the runtime calls counting a window.
   */
  it.each([
    ["a page read through, counted exactly", READ_THROUGH, [EXACTLY]],
    ["a page whose visits straddled a window", READ_THROUGH, [STRADDLED]],
    ["a page with no arrival count", READ_THROUGH, [] as readonly StoredPageViews[]],
    ["a page nothing marks the openings of", READ_THROUGH, [door({ appearances: 12 })]],
    ["a page nothing has counted yet", [] as readonly ReaderTally[], [door({ opened: 9 })]],
    ["a page with arrivals still waiting", READ_THROUGH, [door({ opened: 40, appearances: 30 })]],
  ])("says nothing in the runtime's words about %s", (_case, tallies, rows) => {
    const arrivals = reading(tallies, rows)

    const said = [
      arrivalsSummary(arrivals),
      gotThisFar(arrivals) === undefined ? "" : readingOf(gotThisFar(arrivals)!),
      countsAreGenerous(arrivals) ?? "",
      countsAreExact(arrivals) ?? "",
      stillArriving(arrivals) ?? "",
      cannotBeAShare(arrivals) ?? "",
      ...arrivals.parts.map((part) => readersAt(part, arrivals) ?? ""),
    ].join(" ")

    expect(runtimeWordsIn(said)).toEqual([])
  })

  /**
   * The unreconciled sentence is asserted on its own because the state needs a
   * reading no other case in the table above produces.
   */
  it("says nothing in the runtime's words about counters older than the arrivals", () => {
    const arrivals = reading(
      [tally("n_page", { views: 30, reached: 30 }), tally("n_band", { views: 30, reached: 44 })],
      [EXACTLY]
    )

    expect(runtimeWordsIn(cannotBeAShare(arrivals) ?? "")).toEqual([])
  })
})
