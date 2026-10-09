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
import {
  pageActionOf,
  pageReachOf,
  pageReadingOf,
  type ReaderTally,
  type StoredPageViews,
} from "@jam-overture/loom/signals"

import { runtimeWordsIn } from "@/app/(portal)/_test/plain-language"
import { recordOf, surfaceOf } from "@/app/(portal)/_test/rendered"
import { arrivalsOf, type PageArrivals } from "@/app/(portal)/_lib/arrivals"
import { doingOf, type PageDoing } from "@/app/(portal)/_lib/doing"
import type { PartName } from "@/app/(portal)/_lib/part-name"

import { WhatReadersDid } from "./what-readers-did"

const treeId = treeIdSchema.parse("t_seed1")
const nodeId = (id: string) => nodeIdSchema.parse(id)
const type = (value: string) => primitiveTypeSchema.parse(value)

const names: ReadonlyMap<string, PartName> = new Map([
  ["n_page", { name: "the page “Autumn arrivals”", nodeId: "n_page" }],
  ["n_hero", { name: "the card “Autumn arrivals”", nodeId: "n_hero" }],
  ["n_band", { name: "the section “Pick a plan”", nodeId: "n_band" }],
  ["n_buy", { name: "the buy button “Order now”", nodeId: "n_buy" }],
  ["n_foot", { name: "the footer “Built with Loom”", nodeId: "n_foot" }],
])

const text = (id: string): LoomNode => ({ kind: "text", id: nodeId(id), value: "words" })

const region = (id: string, primitive: string, children: readonly LoomNode[]): ElementNode => ({
  kind: "element",
  id: nodeId(id),
  type: type(primitive),
  props: {},
  children,
})

const PAGE: LoomTree = {
  schemaVersion: 1,
  treeId,
  revision: 2,
  root: region("n_page", "loom.page", [
    region("n_hero", "loom.card", [region("n_herowords", "loom.prose", [text("n_herotext")])]),
    region("n_band", "loom.section", [
      region("n_bandwords", "loom.prose", [text("n_bandtext")]),
      region("n_buy", "acme.buy-button", [text("n_buytext")]),
    ]),
    region("n_foot", "loom.footer", [region("n_footwords", "loom.prose", [text("n_foottext")])]),
  ]),
}

const DECLARED = { copyFor: () => undefined, typesWithRole: () => [] }

/**
 * A row, with the registered type as a plain string: the brand is what may be
 * *read* as one and a fixture is writing one, so the parse happens here rather
 * than at nine call sites.
 */
const tally = (
  id: string,
  counters: Partial<Omit<ReaderTally, "type">> & { readonly type?: string } = {}
): ReaderTally => ({
  treeId,
  revision: 2,
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

const door = (opened: number, appearances: number): StoredPageViews => ({
  treeId,
  revision: 2,
  opened,
  appearances,
  updatedAt: "2026-10-08T09:00:00.000Z",
})

const drawn = (
  tallies: readonly ReaderTally[],
  rows: readonly StoredPageViews[] = []
): HTMLElement => {
  const joined = pageReadingOf(PAGE, tallies, DECLARED)
  const arrivals: PageArrivals | undefined =
    rows.length === 0 ? undefined : arrivalsOf(pageReachOf(joined, rows), names)
  const doing: PageDoing = doingOf(pageActionOf(joined), names, arrivals)

  return render(<WhatReadersDid doing={doing} arrivals={arrivals} />).container
}

/**
 * Forty visits, twenty of which did something; twelve of those in the middle
 * band, where fourteen presses landed. Nobody touched the footer, which three
 * of them read.
 */
const USED: readonly ReaderTally[] = [
  tally("n_page", { views: 40, reached: 40, engaged: 20, type: "loom.page" }),
  tally("n_hero", { views: 40, reached: 36, engaged: 3 }),
  tally("n_band", { views: 40, reached: 30, engaged: 12, type: "loom.section" }),
  tally("n_buy", { views: 40, reached: 28, activations: 14, type: "acme.buy-button" }),
  tally("n_foot", { views: 40, reached: 3, type: "loom.footer" }),
]

describe("the section about what readers did", () => {
  it("asks the question in the words somebody would ask it in", () => {
    expect(surfaceOf(drawn(USED))).toContain("What did readers do here?")
  })

  /**
   * **Readers first, occurrences second, and never mixed.** A headcount off one
   * row and a count of events are both worth having, and a section that
   * interleaved them would invite a reader to add them up.
   */
  it("says the headcount before any count of events", () => {
    const surface = surfaceOf(drawn(USED))

    expect(surface.indexOf("did something on this page")).toBeLessThan(
      surface.indexOf("was pressed 14 times")
    )
  })

  /**
   * The one line here a person can act on this afternoon, so it comes before the
   * two that are news about what is working.
   */
  it("puts the region readers ignore before the region they used", () => {
    const surface = surfaceOf(drawn(USED))

    expect(surface.indexOf("and do nothing in it")).toBeLessThan(
      surface.indexOf("saw the most of that was")
    )
  })

  /**
   * The governing principle, at this section's own boundary: a reader meets
   * sentences, and the runtime's names for what was counted are one click down
   * and complete.
   */
  it("keeps the runtime's vocabulary out of the surface and all of it in the record", () => {
    const container = drawn(USED, [door(32, 40)])

    expect(runtimeWordsIn(surfaceOf(container))).toEqual([])

    const record = recordOf(container)

    for (const word of ["engaged", "reached", "untouched", "acted", "revision"]) {
      expect([word, record.includes(word)]).toEqual([word, true])
    }
  })

  /**
   * Nothing is removed to make a screen simpler. Every part of the page is in
   * the record with its standing, its counters apart, its intensity and how
   * often what was opened was shut again — including the parts whose share is
   * withheld, which on an ordinary page is most of them.
   */
  it("keeps a row for every part of the page, not only the ones with a share", () => {
    const container = drawn(USED, [door(32, 40)])
    const table = [...container.querySelectorAll("details table")][0]

    expect(table?.querySelectorAll("tbody tr")).toHaveLength(8)
    expect(recordOf(container)).toContain("per reader")
    expect(recordOf(container)).toContain("shut again")
  })

  /**
   * **The state to refuse to draw.** The page holds presses and credits a
   * reader inside nothing, so every share would be a nought and every region
   * would read as untouched while the counters look perfectly healthy. A
   * headcount drawn beside that notice is the failure this section exists to
   * refuse.
   */
  it("draws no share at all where nothing said which part an action happened in", () => {
    const container = drawn([
      tally("n_buy", { views: 6, reached: 5, activations: 7, type: "acme.buy-button" }),
      tally("n_band", { views: 6, reached: 4, opens: 2, type: "loom.section" }),
    ])
    const surface = surfaceOf(container)

    expect(surface).toContain("Something was used here, and nothing said where.")
    expect(surface).not.toContain("did something on this page")
    expect(surface).not.toContain("and do nothing in it")
    expect(surface).not.toContain("was pressed")
    expect(container.querySelector('[data-tone="notice"]')).not.toBeNull()
  })

  /** The name of the thing to fix, where the person who can fix it will look. */
  it("keeps what an unplaced action is missing one click down, and never further", () => {
    const container = drawn([
      tally("n_buy", { views: 6, reached: 5, activations: 7, type: "acme.buy-button" }),
    ])

    expect(recordOf(container)).toContain("broadcastReaderSignals")
    expect(surfaceOf(container)).not.toContain("broadcastReaderSignals")
  })

  /**
   * Good news gets the tone that exists for it, rather than arriving as a line
   * that is simply not there.
   */
  it("says every region was used in the tone this portal keeps for a good result", () => {
    const container = drawn([
      tally("n_page", { views: 9, reached: 9, engaged: 5, type: "loom.page" }),
      tally("n_hero", { views: 9, reached: 9, engaged: 4 }),
    ])

    expect(surfaceOf(container)).toContain("no section here that readers reach and never touch")
    expect(container.querySelector('[data-tone="settled"]')).not.toBeNull()
  })

  it("offers nothing to press, because a reading is not a control", () => {
    const container = drawn(USED, [door(32, 40)])

    expect(container.querySelector("button")).toBeNull()
    expect(container.querySelector("form")).toBeNull()
  })

  /**
   * A page nobody used is a real answer about a page meant to be read rather
   * than used, and the section is drawn saying it. A section that vanished
   * would leave a reader unable to tell that from a section that failed.
   */
  it("is still a section on a page nobody did anything on", () => {
    const surface = surfaceOf(
      drawn([
        tally("n_page", { views: 9, reached: 9, type: "loom.page" }),
        tally("n_hero", { views: 9, reached: 9 }),
      ])
    )

    expect(surface).toContain("What did readers do here?")
    expect(surface).toContain("Nobody did anything on this page")
  })
})
