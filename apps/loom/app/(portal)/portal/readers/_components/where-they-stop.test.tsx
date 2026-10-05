import { render } from "@testing-library/react"
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

import { namesInTree } from "@/app/(portal)/_lib/part-name"
import {
  fallReading,
  fallSentence,
  stoppingOf,
  type PageStopping,
} from "@/app/(portal)/_lib/stopping"
import { runtimeWordsIn } from "@/app/(portal)/_test/plain-language"
import { recordOf, surfaceOf } from "@/app/(portal)/_test/rendered"

import { FallSentence, WhereTheyStop } from "./where-they-stop"

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

/** Three bands under a page, each saying something, so every name is a quote. */
const PAGE: LoomTree = {
  schemaVersion: 1,
  treeId: TREE,
  revision: 4,
  root: element("n_page", "loom.page", [
    element("n_hero", "loom.card", [text("n_herow", "Autumn arrivals")]),
    element("n_price", "loom.card", [text("n_pricew", "What it costs")]),
    element("n_ask", "loom.card", [text("n_askw", "Questions")]),
  ]),
}

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

const reading = (tallies: readonly ReaderTally[]): PageStopping =>
  stoppingOf(readingProgressOf(pageReadingOf(PAGE, tallies, DECLARED)), namesInTree(PAGE))

const drawn = (tallies: readonly ReaderTally[]) =>
  render(<WhereTheyStop stopping={reading(tallies)} />)

/** Everybody gets to the pricing band and four in ten stop there. */
const DROPS_OFF: readonly ReaderTally[] = [
  tally("n_page", { views: 100, reached: 100, type: "loom.page" }),
  tally("n_hero", { views: 100, reached: 98 }),
  tally("n_price", { views: 100, reached: 90 }),
  tally("n_ask", { views: 100, reached: 54 }),
]

/** Nobody left in the middle of anything, which is the answer somebody hopes for. */
const HELD: readonly ReaderTally[] = [
  tally("n_page", { views: 40, reached: 40, type: "loom.page" }),
  tally("n_hero", { views: 40, reached: 40 }),
  tally("n_price", { views: 40, reached: 40 }),
  tally("n_ask", { views: 40, reached: 40 }),
]

describe("what a reader meets", () => {
  /**
   * The finding, in one sentence, with both parts named — and before the rows
   * that are the evidence for it. A reader who met the rows first would be
   * doing the reading the module already did.
   */
  it("leads with the fall and names both parts", () => {
    const { container } = drawn(DROPS_OFF)
    const said = surfaceOf(container)

    expect(said).toContain("4 in 10 of the people who got as far as")
    expect(said).toContain("the card “What it costs”")
    expect(said).toContain("the card “Questions”")
    expect(said.indexOf("4 in 10 of the people")).toBeLessThan(said.indexOf("who got this far"))
  })

  /**
   * The share is on the surface and the counts it was made of are not — the
   * reverse of every other section on this card, because a reach is generous by
   * every visit that straddled a roll-up boundary and only a ratio between two
   * parts of one page divides that out.
   */
  it("keeps the counts the share was made of behind the disclosure", () => {
    const { container } = drawn(DROPS_OFF)

    expect(surfaceOf(container)).not.toContain("lost 36")
    expect(recordOf(container)).toContain("lost 36 of 90")
    expect(recordOf(container)).toContain("share 0.400")
  })

  /** The one thing a person is asked to do about it, and it is never a change. */
  it("names the part to look at, which is the one above the fall", () => {
    const said = surfaceOf(drawn(DROPS_OFF).container)

    expect(said).toContain("If one thing on this page is worth changing, it is the card “What it costs”")
    expect(said).not.toContain("worth changing, it is the card “Questions”")
  })

  /**
   * The rows are the page's own order and nothing is sorted. A list ranked
   * worst-first is a different screen answering a different question, and it is
   * the one that cannot show a drop-off at all.
   */
  it("draws the group it happened in, in reading order", () => {
    const { container } = drawn(DROPS_OFF)
    const rows = [...container.querySelectorAll("ol li")].map((row) => row.textContent ?? "")

    expect(rows).toHaveLength(3)
    expect(rows[0]).toContain("n_hero")
    expect(rows[1]).toContain("n_price")
    expect(rows[2]).toContain("n_ask")
  })

  /**
   * Good news said out loud rather than drawn as a blank space, which is the
   * rule that made `settled` a tone: *nothing was measured* and *nobody stopped
   * anywhere* render identically as silence and mean opposite things.
   */
  it("says so when nobody dropped off, rather than drawing nothing", () => {
    const said = surfaceOf(drawn(HELD).container)

    expect(said).toContain("not losing people anywhere")
    expect(said).toContain("Nobody dropped off between any two parts of this page")
  })

  /**
   * **Found in a photograph.** The section above can say *every part of this
   * page came onto somebody's screen* directly over *5 in 10 of the people who
   * got this far stopped here*, and both are exactly true — one is about parts
   * and the other is about people. A reader who takes the first as an answer to
   * the second reads the two as a contradiction, so the difference is said
   * rather than left to be worked out. Same move as `_lib/screen-names.ts`.
   */
  it("says what it is not, because the section above it answers a question that sounds the same", () => {
    const said = surfaceOf(drawn(DROPS_OFF).container)

    expect(said).toContain("A different question from the one above")
    expect(said.indexOf("A different question")).toBeLessThan(said.indexOf("places on this page"))
  })

  it("says nothing was counted rather than that nobody read it", () => {
    const said = surfaceOf(drawn([tally("n_hero")]).container)

    expect(said).toContain("nothing yet to say about where people stop reading")
    expect(said).not.toContain("Nobody dropped off")
  })

  /**
   * A part that reported a click and never reported being on screen. The notice
   * is about the page's wiring rather than about its readers, which is the one
   * sentence here that sends somebody somewhere other than their copy.
   */
  it("reports a part that never said it was seen as a wiring problem", () => {
    const { container } = drawn([
      tally("n_page", { views: 60, reached: 60, type: "loom.page" }),
      tally("n_hero", { views: 60, reached: 60 }),
      tally("n_price", { views: 60, activations: 4 }),
      tally("n_ask", { views: 60, reached: 30 }),
    ])

    expect(surfaceOf(container)).toContain("never reported coming onto anybody’s screen")
    expect(surfaceOf(container)).toContain("usually the page rather than the people")
    expect(recordOf(container)).toContain("cannot anchor")
  })

  /**
   * The governing principle, as a property. Every runtime word is behind the
   * click and none of them is in front of it.
   */
  it("says none of the surface in the runtime’s words and keeps them in the record", () => {
    const { container } = drawn(DROPS_OFF)

    expect(runtimeWordsIn(surfaceOf(container), ["version"])).toEqual([])
    expect(recordOf(container)).toContain("readingProgressOf")
  })

  /**
   * Nothing is removed. Every group of the page is in the record whether or not
   * it lost anybody, which is the half of the principle a surface test cannot
   * reach.
   */
  it("keeps every group and every reach in the record", () => {
    const record = recordOf(drawn(HELD).container)

    for (const id of ["n_hero", "n_price", "n_ask"]) expect(record).toContain(id)
    expect(record).toContain("reached 40")
    expect(record).toContain("no fall")
  })

  /** The one sum this reading permits is a count of positions, never of people. */
  it("says in the record that there is no total of people lost", () => {
    expect(recordOf(drawn(DROPS_OFF).container)).toContain("There is no total")
  })
})

describe("a sentence with two names in it", () => {
  /**
   * The half a `fallReading` test cannot reach: the line can be correct and the
   * component can still drop the words between the two names, and nothing would
   * fail. Asserted at the other end, exactly as `PlainSentence` is.
   */
  it("renders exactly what the line reads as", () => {
    const line = fallSentence(reading(DROPS_OFF).steepest!)
    const { container } = render(<FallSentence line={line} />)

    expect(container.textContent).toBe(fallReading(line))
  })

  /** The words are body text and only the identifier is monospace. */
  it("never sets a named part in monospace", () => {
    const line = fallSentence(reading(DROPS_OFF).steepest!)
    const { container } = render(<FallSentence line={line} />)
    const mono = [...container.querySelectorAll(".font-mono")].map((one) => one.textContent ?? "")

    expect(mono).toEqual(["n_price", "n_ask"])
  })
})
