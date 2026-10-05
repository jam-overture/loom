import { describe, expect, it } from "vitest"

import {
  nodeIdSchema,
  primitiveTypeSchema,
  treeIdSchema,
  type ElementNode,
  type LoomNode,
  type LoomTree,
} from "@jam-overture/loom"
import { pageReadingOf, readingProgressOf, type ReaderTally } from "@jam-overture/loom/signals"

import { runtimeWordsIn } from "../_test/plain-language"
import { namesInTree } from "./part-name"
import {
  arrivedPartWayDown,
  fallReading,
  fallSentence,
  heldAllTheWay,
  notReporting,
  placesCount,
  plainShare,
  runsThatLose,
  stoppingOf,
  stoppingSummary,
  whatToLookAt,
  type PageStopping,
} from "./stopping"
import { readingOf } from "./vocabulary"

const nodeId = (id: string) => nodeIdSchema.parse(id)
const type = (value: string) => primitiveTypeSchema.parse(value)

const TREE = treeIdSchema.parse("t_1")

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

/**
 * The registered type is taken as a plain string and branded here, which every
 * other call site in this lane does too: a fixture that had to write
 * `type: type("loom.page")` at each row would put the brand in front of the
 * number the row is actually about.
 */
const tally = (
  id: string,
  counters: Partial<Omit<ReaderTally, "type">> & { readonly type?: string } = {}
): ReaderTally => ({
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
 * Four bands under one page, each with a heading inside it.
 *
 * **Two levels, deliberately.** The whole point of 0221 is that a fall is
 * between siblings and that a page-wide sequence of reach counts is not
 * descending — a heading inside the first band comes before the second band in
 * reading order and is reached by fewer visits than it. A flat fixture would let
 * an implementation that compared every part to the one after it in reading
 * order pass every case below, and that implementation is the defect this
 * module exists to avoid.
 */
const PAGE = treeOf(
  element("n_page", "loom.page", [
    element("n_intro", "loom.card", [
      element("n_introh", "loom.heading", [text("n_introw", "Welcome")]),
    ]),
    element("n_how", "loom.card", [
      element("n_howh", "loom.heading", [text("n_howw", "How it works")]),
    ]),
    element("n_price", "loom.card", [
      element("n_priceh", "loom.heading", [text("n_pricew", "What it costs")]),
    ]),
    element("n_ask", "loom.card", [
      element("n_askh", "loom.heading", [text("n_askw", "Questions")]),
    ]),
  ])
)

/**
 * The reading, taken through the published join exactly as the screen does.
 *
 * No double of `ReadingProgress`. The one thing this module must get right is
 * that it reads the runtime's answer rather than a plausible shape, and a
 * hand-written `runs` array would have let every sentence below be asserted
 * against a page the runtime would never produce.
 */
const stopping = (tallies: readonly ReaderTally[], tree: LoomTree = PAGE): PageStopping =>
  stoppingOf(readingProgressOf(pageReadingOf(tree, tallies, DECLARED)), namesInTree(tree))

/**
 * A hundred visits that thin out down the page, and the four headings inside the
 * bands all reached by whoever reached their band.
 *
 * So there is exactly one run with falls in it — the four bands under the page —
 * and four runs of one heading each, which the runtime leaves out because an
 * only child has nowhere for reading to stop.
 */
const THINNING: readonly ReaderTally[] = [
  tally("n_page", { views: 100, reached: 100, type: "loom.page" }),
  tally("n_intro", { views: 100, reached: 98 }),
  tally("n_introh", { views: 100, reached: 98, type: "loom.heading" }),
  tally("n_how", { views: 100, reached: 94 }),
  tally("n_howh", { views: 100, reached: 94, type: "loom.heading" }),
  tally("n_price", { views: 100, reached: 90 }),
  tally("n_priceh", { views: 100, reached: 90, type: "loom.heading" }),
  tally("n_ask", { views: 100, reached: 54 }),
  tally("n_askh", { views: 100, reached: 54, type: "loom.heading" }),
]

describe("where a page loses its readers", () => {
  /**
   * The property the module exists for, and the one the card could not state.
   *
   * Every part of this page was read — nothing skipped, nothing trailing, the
   * section above this one entirely green — and the page still loses a third of
   * the people who reach the pricing band. That page had nothing on this screen
   * to say so before.
   */
  it("names the two parts the page loses most of its readers between", () => {
    const steepest = stopping(THINNING).steepest

    expect(steepest?.after.nodeId).toBe("n_price")
    expect(steepest?.before.nodeId).toBe("n_ask")
    expect(steepest?.lost).toBe(36)
    expect(steepest?.reached).toBe(90)
  })

  /**
   * By people and not by rate, which is the runtime's ranking rule and this is
   * the assertion that the reading did not re-sort it.
   *
   * `n_intro` → `n_how` loses 4 of 98 and `n_price` → `n_ask` loses 36 of 90.
   * The rates are 4% and 40%, so both rankings agree here — which is why the
   * case below exists.
   */
  it("ranks the steepest fall by the people lost rather than by the share", () => {
    /*
     * One visit in three left at the top, thirty of ninety at the bottom. The
     * share says the top is three times worse; the number of people says the
     * bottom is ten times the problem. A screen ranking by share would put a
     * page's quietest corner at the top of it for ever.
     */
    const lopsided = stopping([
      tally("n_page", { views: 100, reached: 3, type: "loom.page" }),
      tally("n_intro", { views: 100, reached: 3 }),
      tally("n_how", { views: 100, reached: 1 }),
      tally("n_price", { views: 100, reached: 90 }),
      tally("n_ask", { views: 100, reached: 60 }),
    ])

    expect(lopsided.steepest?.after.nodeId).toBe("n_price")
    expect(lopsided.steepest?.lost).toBe(30)
  })

  /**
   * The cousin comparison, refused.
   *
   * `n_introh` sits inside `n_intro` and is reached by 98 visits; `n_how` is
   * the next part in reading order and is reached by 94. That is a fall of 4 in
   * document order and it is not a fall at all — they are a part and its
   * uncle — and a reading that reported it would be making exactly the claim
   * the card's old highlight made.
   */
  it("never pairs a part with anything but its own sibling", () => {
    const pairs = stopping(THINNING).runs.flatMap((run) =>
      run.falls.map((fall) => [fall.after.nodeId, fall.before.nodeId])
    )

    expect(pairs).toEqual([
      ["n_intro", "n_how"],
      ["n_how", "n_price"],
      ["n_price", "n_ask"],
    ])
  })

  /** A count of positions, never of people — the one sum 0221 permits. */
  it("counts the places reading falls off and never adds the people lost at them", () => {
    const reading = stopping(THINNING)

    expect(reading.places).toBe(3)
    expect(Object.keys(reading)).not.toContain("lost")
  })

  /**
   * A part that reported a click and never reported coming into view.
   *
   * Its reach of `0` is an absence of evidence, so the runtime passes it over
   * rather than reporting a cliff — and the reading counts it where somebody can
   * see it instead of letting it read as a part nobody got to.
   */
  it("leaves a part that never reported being seen out of the pairs and counts it", () => {
    const reading = stopping([
      tally("n_page", { views: 50, reached: 50, type: "loom.page" }),
      tally("n_intro", { views: 50, reached: 50 }),
      tally("n_how", { views: 50, activations: 3 }),
      tally("n_price", { views: 50, reached: 20 }),
      tally("n_ask", { views: 50, reached: 20 }),
    ])

    expect(reading.unanchored.map((part) => part.nodeId)).toContain("n_how")
    expect(
      reading.runs.flatMap((run) => run.falls.map((fall) => [fall.after.nodeId, fall.before.nodeId]))
    ).toEqual([["n_intro", "n_price"]])
  })

  /**
   * A fall is named by what the part says, which is the whole difference between
   * a sentence somebody can act on and a pair of identifiers.
   */
  it("names both ends of a fall by what the part says, with the identifier kept beside it", () => {
    const steepest = stopping(THINNING).steepest!

    expect(steepest.after.name.name).toBe("the card “What it costs”")
    expect(steepest.after.name.nodeId).toBe("n_price")
    expect(steepest.before.name.name).toBe("the card “Questions”")
  })

  /** A window with no visits of this version answers nothing, rather than everything. */
  it("answers nothing on a version nothing has reported about", () => {
    const quiet = stopping([tally("n_intro", { revision: 1 })])

    expect(quiet.views).toBe(0)
    expect(quiet.runs).toEqual([])
    expect(quiet.steepest).toBeUndefined()
    expect(quiet.places).toBe(0)
  })

  /** Readers arriving part way down, counted and not warned about. */
  it("counts a later part reached by more visits than the one above it", () => {
    const reading = stopping([
      tally("n_page", { views: 30, reached: 30, type: "loom.page" }),
      tally("n_intro", { views: 30, reached: 10 }),
      tally("n_how", { views: 30, reached: 25 }),
      tally("n_price", { views: 30, reached: 25 }),
      tally("n_ask", { views: 30, reached: 25 }),
    ])

    expect(reading.gained).toBe(1)
    expect(reading.steepest).toBeUndefined()
  })
})

describe("the sentences a person reads", () => {
  const SHARES: readonly [number, string][] = [
    [1, "almost all of the people"],
    [0.9, "9 in 10 of the people"],
    [0.4, "4 in 10 of the people"],
    [0.12, "1 in 10 of the people"],
    [0.02, "fewer than 1 in 10 of the people"],
  ]

  it.each(SHARES)("says a share of %s in words a person uses", (share, said) => {
    expect(plainShare(share)).toBe(said)
  })

  /**
   * The share leads and the counts do not, which is the reverse of every other
   * section on this card. `_lib/stopping.ts` has the argument: a reach is
   * generous by every visit that straddled a roll-up boundary and a ratio
   * between two parts of one page divides that over-count out, so the share is
   * the figure a person may quote and the counts are the ones they may not.
   */
  it("leads with the share and never with a count of people", () => {
    const said = fallReading(fallSentence(stopping(THINNING).steepest!))

    expect(said).toContain("4 in 10 of the people")
    expect(said).not.toContain("36")
    expect(said).not.toContain("90")
  })

  it("reads as one sentence naming both parts", () => {
    expect(fallReading(fallSentence(stopping(THINNING).steepest!))).toBe(
      "4 in 10 of the people who got as far as the card “What it costs” n_price never went on to the card “Questions” n_ask."
    )
  })

  /**
   * *Everybody … never went on* is what one template would have produced, and
   * it is not a sentence. English has *nobody went on* for a share of one.
   */
  it("says nobody went on where the share is all of them", () => {
    /*
     * `n_how` has no row at all rather than a row reporting nothing, and the
     * difference is the whole of what `anchors` is for: a row reporting a reach
     * of zero is a part that said something other than *I was seen*, which the
     * runtime refuses to put at the end of a fall. No row, on a version with
     * visits, is the one that means nobody got there.
     */
    const all = stopping([
      tally("n_page", { views: 20, reached: 20, type: "loom.page" }),
      tally("n_intro", { views: 20, reached: 20 }),
    ])

    expect(fallReading(fallSentence(all.steepest!))).toBe(
      "Nobody who got as far as the card “Welcome” n_intro went on to the card “How it works” n_how."
    )
  })

  /**
   * The part **above** the fall. The last thing a reader saw before they left is
   * the thing that did not carry them; naming the part below would send somebody
   * to rewrite the part nobody read.
   */
  it("points at the part above the fall and not the one below it", () => {
    const line = whatToLookAt(stopping(THINNING).steepest!)

    expect(readingOf(line)).toBe(
      "If one thing on this page is worth changing, it is the card “What it costs” n_price — it is the last thing people saw before they left."
    )
  })

  /** Four answers, and three of them are not a reading. */
  it("says which of the four things is true rather than drawing nothing", () => {
    expect(stoppingSummary(stopping([tally("n_intro")]))).toContain("nothing yet to say")

    expect(
      stoppingSummary(
        stopping([
          tally("n_page", { views: 9, reached: 9, type: "loom.page" }),
          tally("n_intro", { views: 9, reached: 9 }),
          tally("n_how", { views: 9, reached: 9 }),
          tally("n_price", { views: 9, reached: 9 }),
          tally("n_ask", { views: 9, reached: 9 }),
        ])
      )
    ).toContain("not losing people anywhere")

    expect(stoppingSummary(stopping(THINNING))).toBe(
      "There are 3 places on this page where people stop going, and this is the biggest."
    )
  })

  /** A page with no two parts side by side has nowhere for reading to stop. */
  it("says a page of only children has nowhere to stop", () => {
    const lonely = treeOf(element("n_page", "loom.page", [element("n_intro", "loom.card", [])]))

    expect(
      stoppingSummary(
        stopping(
          [
            tally("n_page", { views: 5, reached: 5, type: "loom.page" }),
            tally("n_intro", { views: 5, reached: 5 }),
          ],
          lonely
        )
      )
    ).toBe("This page has no two parts sitting side by side, so there is nowhere for reading to stop.")
  })

  it("never says one place as places", () => {
    expect(placesCount(1)).toBe("1 place")
    expect(placesCount(2)).toBe("2 places")
  })

  /**
   * The rule this lane judges every unasked sentence against: no runtime word on
   * the surface, and the technical reading one click down carries them all.
   */
  it("says none of it in the runtime’s words", () => {
    const reading = stopping(THINNING)
    const quiet = stopping([
      tally("n_page", { views: 50, reached: 50, type: "loom.page" }),
      tally("n_intro", { views: 50, reached: 50 }),
      tally("n_how", { views: 50, activations: 3 }),
      tally("n_price", { views: 50, reached: 20 }),
    ])
    const rising = stopping([
      tally("n_page", { views: 30, reached: 30, type: "loom.page" }),
      tally("n_intro", { views: 30, reached: 10 }),
      tally("n_how", { views: 30, reached: 25 }),
    ])

    const said = [
      stoppingSummary(reading),
      stoppingSummary(quiet),
      fallReading(fallSentence(reading.steepest!)),
      readingOf(whatToLookAt(reading.steepest!)),
      notReporting(quiet) ?? "",
      arrivedPartWayDown(rising) ?? "",
      heldAllTheWay(reading) ?? "",
    ]

    for (const sentence of said) expect(runtimeWordsIn(sentence)).toEqual([])
  })

  /** Good news is said rather than shown as an absence. */
  it("says the groups nobody left in the middle of", () => {
    const reading = stopping(THINNING)

    /*
     * Four headings sit alone inside their bands, so the runtime leaves those
     * runs out entirely — an only child has no sibling to be compared with. The
     * page's own run of four bands is the only one there is, and it loses
     * people, so there is nothing to report as held.
     */
    expect(runsThatLose(reading)).toHaveLength(1)
    expect(reading.runs).toHaveLength(1)
    expect(heldAllTheWay(reading)).toBeUndefined()
  })

  it("names the groups that held when there is more than one run", () => {
    /*
     * Two bands, each with two headings inside it. The page's run loses nobody;
     * the first band's run loses four of ten. So one run held and one did not,
     * which is the sentence this is about.
     */
    const twoDeep = treeOf(
      element("n_page", "loom.page", [
        element("n_intro", "loom.card", [
          element("n_introh", "loom.heading", []),
          element("n_introp", "loom.prose", []),
        ]),
        element("n_how", "loom.card", [
          element("n_howh", "loom.heading", []),
          element("n_howp", "loom.prose", []),
        ]),
      ])
    )

    const reading = stopping(
      [
        tally("n_page", { views: 10, reached: 10, type: "loom.page" }),
        tally("n_intro", { views: 10, reached: 10 }),
        tally("n_introh", { views: 10, reached: 10, type: "loom.heading" }),
        tally("n_introp", { views: 10, reached: 6, type: "loom.prose" }),
        tally("n_how", { views: 10, reached: 10 }),
        tally("n_howh", { views: 10, reached: 10, type: "loom.heading" }),
        tally("n_howp", { views: 10, reached: 10, type: "loom.prose" }),
      ],
      twoDeep
    )

    expect(reading.places).toBe(1)
    expect(heldAllTheWay(reading)).toBe(
      "In 2 other groups of parts on this page, everybody who saw the first of them saw the last."
    )
  })

  /** Nothing to report is reported as nothing, not as a reassurance nobody asked for. */
  it("says nothing about rises or quiet parts when there are none", () => {
    const reading = stopping(THINNING)

    expect(arrivedPartWayDown(reading)).toBeUndefined()
    expect(notReporting(reading)).toBeUndefined()
  })
})
