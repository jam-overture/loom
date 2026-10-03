import { describe, expect, it } from "vitest"

import {
  nodeIdSchema,
  primitiveTypeSchema,
  treeIdSchema,
  type ElementNode,
  type LoomNode,
  type LoomTree,
} from "@jam-overture/loom"
import { PART_STANDINGS, type ReaderTally } from "@jam-overture/loom/signals"

import { runtimeWordsIn } from "../_test/plain-language"
import {
  mismatchedReading,
  nothingSeen,
  nothingSkipped,
  partsCount,
  skippingComparable,
  skippingOf,
  skippingSummary,
  stopReading,
  type PageSkipping,
} from "./skipped"
import { PART_STANDINGS_PLAIN, plainStanding, readingOf } from "./vocabulary"

const nodeId = (id: string) => nodeIdSchema.parse(id)
const type = (value: string) => primitiveTypeSchema.parse(value)

const TREE = treeIdSchema.parse("t_1")
const OTHER = treeIdSchema.parse("t_2")

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

const treeOf = (root: ElementNode, revision = 1): LoomTree => ({
  schemaVersion: 1,
  treeId: TREE,
  revision,
  root,
})

/** Everything the join asks of a deployment, as the two-line double 0114 allows. */
const DECLARED = { copyFor: () => undefined, typesWithRole: () => [] }

const tally = (id: string, counters: Partial<ReaderTally> = {}): ReaderTally => ({
  treeId: counters.treeId ?? TREE,
  revision: counters.revision ?? 1,
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

/**
 * A page of four parts, top to bottom: the page itself, a heading with words in
 * it, a band, and a footer.
 *
 * Deliberately not flat. The finding this module exists for is *where* the
 * reading stops, which is a statement about reading order across depths, and a
 * fixture one level deep would let an implementation that walked breadth-first
 * pass every case below.
 */
const PAGE = treeOf(
  element("n_page", "loom.page", [
    element("n_head", "loom.heading", [text("n_words", "Buy the thing")]),
    element("n_band", "loom.card", [element("n_price", "loom.heading", [])]),
    element("n_foot", "loom.card", []),
  ])
)

const skipping = (tallies: readonly ReaderTally[], tree: LoomTree = PAGE): PageSkipping =>
  skippingOf(tree, tallies, DECLARED)

describe("reading a page against the counters filed for it", () => {
  /**
   * The property the whole module is for. Nothing in the counters mentions
   * `n_foot` at all; a screen reading rows could not have named it, and here it
   * is a measurement.
   */
  it("reports a part nothing was counted about as one nobody got to", () => {
    const reading = skipping([
      tally("n_page", { views: 20, reached: 20 }),
      tally("n_head", { views: 20, reached: 18 }),
      tally("n_band", { views: 20, reached: 6 }),
    ])

    expect(reading.counts).toEqual({ read: 3, skipped: 2, unknown: 0 })
    expect(reading.parts.map((part) => part.standing)).toEqual([
      "read",
      "read",
      "read",
      "skipped",
      "skipped",
    ])
  })

  /**
   * Elements only, and the words inside the heading are not one.
   *
   * A text node carries no identity attributes, so no signal can ever name it —
   * a list that drew one would have a permanent row nobody could ever explain.
   * Five parts rather than four above is `n_price`, which is an element.
   */
  it("lists every part of the page and nothing that is not a part", () => {
    const reading = skipping([tally("n_page", { views: 1, reached: 1 })])

    expect(reading.parts.map((part) => part.nodeId)).toEqual([
      "n_page",
      "n_head",
      "n_band",
      "n_price",
      "n_foot",
    ])
  })

  it("keeps the parts in reading order with the depth they were read at", () => {
    const reading = skipping([tally("n_page", { views: 1, reached: 1 })])

    expect(reading.parts.map((part) => part.depth)).toEqual([0, 1, 1, 2, 1])
  })

  /**
   * A page nobody opened is not a page everybody skipped. With no visits every
   * standing is `unknown`, and the one thing that must never happen is the
   * four unmentioned parts reading as four findings.
   */
  it("says nothing either way about any part when no visit reported in", () => {
    const reading = skipping([])

    expect(reading.views).toBe(0)
    expect(reading.counts).toEqual({ read: 0, skipped: 0, unknown: 5 })
    expect(reading.stops).toBeUndefined()
  })

  /**
   * The rarer, sharper case. A row exists and never reported the part coming
   * into view — somebody pressed something inside it — so calling it skipped
   * would be a lie in the direction nobody checks.
   */
  it("does not call a part nobody saw and somebody used a part nobody got to", () => {
    const reading = skipping([
      tally("n_page", { views: 10, reached: 10 }),
      tally("n_head", { views: 10, reached: 9 }),
      tally("n_band", { views: 10, reached: 0, engaged: 3 }),
      tally("n_price", { views: 10, reached: 0, activations: 3 }),
      tally("n_foot", { views: 10, reached: 4 }),
    ])

    expect(reading.counts).toEqual({ read: 3, skipped: 0, unknown: 2 })
  })

  it("names a part by what it says rather than by what it is", () => {
    const reading = skipping([tally("n_page", { views: 2, reached: 2 })])
    const head = reading.parts.find((part) => part.nodeId === "n_head")

    expect(head?.name.name).toBe("the heading “Buy the thing”")
    expect(head?.name.nodeId).toBe("n_head")
  })

  it("keeps the registered type for the record and off the name", () => {
    const reading = skipping([tally("n_page", { views: 2, reached: 2 })])
    const band = reading.parts.find((part) => part.nodeId === "n_band")

    expect(band?.type).toBe("loom.card")
    expect(band?.name.name).not.toContain("loom.")
  })

  it("carries how many visits reached each part, and zero for the ones nothing counted", () => {
    const reading = skipping([
      tally("n_page", { views: 9, reached: 9 }),
      tally("n_head", { views: 9, reached: 7 }),
    ])

    expect(reading.parts.map((part) => part.reached)).toEqual([9, 7, 0, 0, 0])
  })
})

describe("where the reading stops", () => {
  /**
   * A trailing run, and the run is what a person can act on: the thing above it
   * is where the page loses people.
   */
  it("finds the first of a run of unseen parts that reaches the bottom", () => {
    const reading = skipping([
      tally("n_page", { views: 30, reached: 30 }),
      tally("n_head", { views: 30, reached: 28 }),
    ])

    expect(reading.stops?.part.nodeId).toBe("n_band")
    expect(reading.stops?.parts).toBe(3)
  })

  /**
   * The case a first-gap implementation gets wrong, and it is the common one: a
   * band in the middle nobody got to, on a page whose footer was reached. The
   * gap is a fact about the band; it is not where the page stops.
   */
  it("is absent when the bottom of the page was reached, however many gaps sit above it", () => {
    const reading = skipping([
      tally("n_page", { views: 30, reached: 30 }),
      tally("n_price", { views: 30, reached: 2 }),
      tally("n_foot", { views: 30, reached: 12 }),
    ])

    expect(reading.counts.skipped).toBe(2)
    expect(reading.stops).toBeUndefined()
  })

  /**
   * The run is measured from the bottom up, so a gap above a longer trailing
   * run does not shorten it and does not lengthen it either.
   */
  it("counts only the run that reaches the bottom, not every gap on the page", () => {
    const reading = skipping([
      tally("n_page", { views: 12, reached: 12 }),
      tally("n_band", { views: 12, reached: 5 }),
    ])

    expect(reading.counts.skipped).toBe(3)
    expect(reading.stops?.part.nodeId).toBe("n_price")
    expect(reading.stops?.parts).toBe(2)
  })

  /**
   * **Every part skipped cannot happen, and the arithmetic is why.** A part is
   * skipped only when no row names it; the visit floor is the largest `views`
   * any row reports; so a page with no rows has no visits, and every standing
   * is *nothing can be said* instead. The first shape of this module carried a
   * flag for it. This is the case that showed it was dead.
   */
  it("cannot find a run covering the whole page, because a page with no counted part has no visits", () => {
    const nothing = skipping([])

    expect(nothing.views).toBe(0)
    expect(nothing.counts.skipped).toBe(0)
    expect(nothing.stops).toBeUndefined()

    const rooted = skipping([tally("n_page", { views: 40, reached: 0 })])

    expect(rooted.views).toBe(40)
    expect(rooted.parts[0]!.standing).toBe("unknown")
    expect(rooted.stops?.part.nodeId).toBe("n_head")
  })

  it("has nothing to report on a page every part of which was seen", () => {
    const reading = skipping([
      tally("n_page", { views: 5, reached: 5 }),
      tally("n_head", { views: 5, reached: 5 }),
      tally("n_band", { views: 5, reached: 5 }),
      tally("n_price", { views: 5, reached: 4 }),
      tally("n_foot", { views: 5, reached: 1 }),
    ])

    expect(reading.counts).toEqual({ read: 5, skipped: 0, unknown: 0 })
    expect(reading.stops).toBeUndefined()
  })
})

describe("the counters that are not about this page", () => {
  /**
   * The alarm. Laying one version's counters over another version's page makes
   * most parts read *nobody got to it* while every number stays plausible, and
   * this is the only thing in the reading that can say the pair is wrong.
   */
  it("names the counted parts the page does not have", () => {
    const reading = skipping([
      tally("n_page", { views: 8, reached: 8 }),
      tally("n_gone", { views: 8, reached: 8 }),
    ])

    expect(reading.mismatched).toEqual(["n_gone"])
    expect(mismatchedReading(reading)).toContain("1 part")
  })

  it("draws nothing rather than a reading that would look right and be wrong", () => {
    const reading = skipping([tally("n_page", { views: 8, reached: 8 })])

    expect(reading.mismatched).toEqual([])
    expect(mismatchedReading(reading)).toBeUndefined()
  })

  it("drops a row filed under another page or another version, and counts it", () => {
    const reading = skipping([
      tally("n_page", { views: 8, reached: 8 }),
      tally("n_head", { revision: 2, views: 8, reached: 8 }),
      tally("n_band", { treeId: OTHER, views: 8, reached: 8 }),
    ])

    expect(reading.foreign).toBe(2)
    expect(reading.counts.read).toBe(1)
  })

  it("keeps the first of two rows for one part and says it dropped the rest", () => {
    const reading = skipping([
      tally("n_page", { views: 8, reached: 8 }),
      tally("n_page", { views: 8, reached: 1 }),
    ])

    expect(reading.duplicated).toEqual(["n_page"])
    expect(reading.parts[0]!.reached).toBe(8)
  })
})

describe("whether the counters and the page in hand are the same version", () => {
  it("compares only when the page could be read", () => {
    expect(skippingComparable(4, undefined)).toBe(false)
  })

  it("is true for the version being served and false for any other", () => {
    expect(skippingComparable(4, 4)).toBe(true)
    expect(skippingComparable(4, 5)).toBe(false)
    expect(skippingComparable(5, 4)).toBe(false)
  })
})

describe("the sentences a reader meets", () => {
  it("never says 1 parts", () => {
    expect(partsCount(1)).toBe("1 part")
    expect(partsCount(0)).toBe("0 parts")
    expect(partsCount(4)).toBe("4 parts")
  })

  it("carries the denominator with every count", () => {
    const said = skippingSummary(
      skipping([
        tally("n_page", { views: 30, reached: 30 }),
        tally("n_head", { views: 30, reached: 28 }),
      ])
    )

    expect(said).toContain("5 parts")
    expect(said).toContain("Nobody got to the other 3 parts")
  })

  it("says a page nothing was missed on was not missed, rather than saying nothing", () => {
    const whole = skipping([
      tally("n_page", { views: 5, reached: 5 }),
      tally("n_head", { views: 5, reached: 5 }),
      tally("n_band", { views: 5, reached: 5 }),
      tally("n_price", { views: 5, reached: 5 }),
      tally("n_foot", { views: 5, reached: 5 }),
    ])

    expect(skippingSummary(whole)).toBe("Every part of this page came onto somebody’s screen.")
    expect(nothingSkipped(whole)).toContain("Nothing on this page is being scrolled past")
  })

  /**
   * The reassurance must not be printed over a page nothing is known about.
   * *Nothing is being scrolled past* on a deployment nobody has visited is the
   * plausible-false-number failure in one sentence.
   */
  it("offers no reassurance about a page no visit reported on", () => {
    expect(nothingSkipped(skipping([]))).toBeUndefined()
  })

  it("says there is nothing to say when no visit reported in", () => {
    expect(skippingSummary(skipping([]))).toContain("No visit has reported anything")
  })

  it("keeps the quiet parts apart from the missed ones in one sentence", () => {
    const said = skippingSummary(
      skipping([
        tally("n_page", { views: 10, reached: 10 }),
        tally("n_head", { views: 10, reached: 9 }),
        tally("n_band", { views: 10, reached: 0, engaged: 2 }),
      ])
    )

    expect(said).toContain("Nobody got to 2 parts")
    expect(said).toContain("1 part reported something without reporting being on screen")
  })

  it("names the part the reading stops at, in the middle of the sentence", () => {
    const reading = skipping([
      tally("n_page", { views: 30, reached: 30 }),
      tally("n_head", { views: 30, reached: 28 }),
    ])

    const said = readingOf(stopReading(reading.stops!))

    expect(said).toContain("Reading stops at the card n_band")
    expect(said).toContain("3 parts in all")
  })

  /**
   * The one reading here that is about the page's wiring rather than its
   * readers. Telling somebody *nobody scrolled* would send them to rewrite a
   * page that is fine.
   */
  it("sends a reader somewhere else when visits reported in and nothing reported reach", () => {
    const reading = skipping([tally("n_page", { views: 40, reached: 0, engaged: 2 })])

    expect(reading.counts.read).toBe(0)
    expect(nothingSeen(reading)).toContain("reporting its visits and not its parts")
  })

  it("says nothing of the kind about a page one part of which was seen", () => {
    expect(
      nothingSeen(
        skipping([
          tally("n_page", { views: 40, reached: 40 }),
          tally("n_head", { views: 40, reached: 0, engaged: 1 }),
        ])
      )
    ).toBeUndefined()
  })

  it("says nothing of the kind about a page no visit reported on", () => {
    expect(nothingSeen(skipping([]))).toBeUndefined()
  })

  /**
   * The governing principle, on this module's own output: plain language is the
   * default, so nothing a reader meets before they have asked says `node`,
   * `tree` or `revision`. `version` is the portal's word and is the one this
   * lane chose on 29 September.
   */
  it.each([
    ["nothing counted", skipping([])],
    [
      "a page with a gap",
      skipping([
        tally("n_page", { views: 30, reached: 30 }),
        tally("n_head", { views: 30, reached: 28 }),
      ]),
    ],
    [
      "a page read to the bottom",
      skipping([
        tally("n_page", { views: 5, reached: 5 }),
        tally("n_head", { views: 5, reached: 5 }),
        tally("n_band", { views: 5, reached: 5 }),
        tally("n_price", { views: 5, reached: 5 }),
        tally("n_foot", { views: 5, reached: 5 }),
      ]),
    ],
  ])("reads plainly about %s", (_case, reading) => {
    const sentences = [
      skippingSummary(reading),
      nothingSkipped(reading),
      nothingSeen(reading),
      mismatchedReading(reading),
      reading.stops === undefined ? undefined : readingOf(stopReading(reading.stops)),
    ].filter((sentence): sentence is string => sentence !== undefined)

    for (const sentence of sentences) expect(runtimeWordsIn(sentence)).toEqual([])
  })

  /**
   * The alarm is a sentence a reader meets, so the rule holds on it too — and
   * it is the one sentence here that is *about* the mismatch of a page and its
   * counters, which is the subject most likely to be explained in the runtime's
   * own words by accident.
   */
  it("reads plainly about counters that are not about this page", () => {
    const said = mismatchedReading(
      skipping([
        tally("n_page", { views: 8, reached: 8 }),
        tally("n_gone", { views: 8, reached: 8 }),
      ])
    )

    expect(said).toBeDefined()
    expect(runtimeWordsIn(said!)).toEqual([])
  })

  /**
   * Guards the guard. A sweep that found no sentence would pass for ever, and
   * this lane disarmed a guard exactly that way by renaming what it looked for.
   */
  it("finds a runtime word in a sentence written the wrong way", () => {
    expect(runtimeWordsIn("Nobody got to this node of the tree.")).toEqual(["node", "tree"])
  })
})

describe("the three answers, in a person's words", () => {
  /**
   * Total over the runtime's own vocabulary, read from the runtime rather than
   * written out — so a fourth standing added to `pageReadingOf` is a failing
   * test in this lane on the day it lands, rather than a state that reaches a
   * reader as a blank.
   */
  it("has a plain word for every standing the runtime can report", () => {
    expect(Object.keys(PART_STANDINGS_PLAIN).sort()).toEqual([...PART_STANDINGS].sort())
  })

  it("keeps the runtime's own name beside each one rather than instead of it", () => {
    for (const standing of PART_STANDINGS) expect(plainStanding(standing).technical).toBe(standing)
  })

  it("leads with a person's words and never with a runtime identifier", () => {
    for (const standing of PART_STANDINGS) {
      const plain = plainStanding(standing)

      expect(plain.label).not.toBe(standing)
      expect(runtimeWordsIn(`${plain.label}. ${plain.meaning}`)).toEqual([])
    }
  })

  /**
   * `unknown` is the record declining to answer, and a tone that made it a
   * quieter shade of a verdict would have the screen implying one was reached.
   */
  it("marks the answer that is not an answer as one nothing follows from", () => {
    expect(plainStanding("unknown").tone).toBe("inapplicable")
    expect(plainStanding("read").tone).not.toBe(plainStanding("skipped").tone)
  })
})
