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
  pageReachOf,
  pageReadingOf,
  type ReaderTally,
  type StoredPageViews,
} from "@jam-overture/loom/signals"

import { runtimeWordsIn } from "@/app/(portal)/_test/plain-language"
import { recordOf, surfaceOf } from "@/app/(portal)/_test/rendered"
import { arrivalsOf, type PageArrivals } from "@/app/(portal)/_lib/arrivals"
import { namesInTree } from "@/app/(portal)/_lib/part-name"

import { HowManyWereThere } from "./how-many-were-there"

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

const arrivals = (
  tallies: readonly ReaderTally[],
  rows: readonly StoredPageViews[]
): PageArrivals =>
  arrivalsOf(pageReachOf(pageReadingOf(PAGE, tallies, DECLARED), rows), namesInTree(PAGE))

const READ_THROUGH: readonly ReaderTally[] = [
  tally("n_page", { views: 30, reached: 30 }),
  tally("n_hero", { views: 30, reached: 27 }),
  tally("n_band", { views: 30, reached: 19 }),
  tally("n_foot", { views: 30, reached: 6 }),
]

const STRADDLED = door({ opened: 30, appearances: 40 })
const EXACTLY = door({ opened: 30, appearances: 30 })

const drawn = (tallies: readonly ReaderTally[], rows: readonly StoredPageViews[]) =>
  render(<HowManyWereThere arrivals={arrivals(tallies, rows)} />)

describe("what a reader meets", () => {
  /**
   * The denominator, first, before any figure drawn against anything else. It
   * is the number this screen never had: every rate on the card was divided by
   * the largest visit count a single row reported, which is a floor and reads
   * as a census.
   */
  it("says how many people were there, in people", () => {
    expect(surfaceOf(drawn(READ_THROUGH, [EXACTLY]).container)).toContain(
      "30 readers arrived at version 4 of this page"
    )
  })

  it("is headed, so it does not read as the section above repeating itself", () => {
    const { container } = drawn(READ_THROUGH, [EXACTLY])

    expect(container.querySelector("h3")?.textContent).toBe("How many people were there?")
  })

  /**
   * **And says nothing about any one part**, which is the correction this file
   * exists in its present shape because of.
   *
   * *Of those 30, about 6 readers got as far as the small print* is the
   * sentence nothing else in the ecosystem can say, and it belongs to the
   * card's own highlights, which has named the part fewest people got to since
   * long before this reading existed. Drawn here as well it would put two
   * figures for one part three lines apart — which is the two-denominator
   * failure this section was built to end, reproduced inside the fix. The
   * first photograph of this branch is what found it.
   */
  it("leaves the part fewest of them got to for the list that already names it", () => {
    const said = surfaceOf(drawn(READ_THROUGH, [EXACTLY]).container)

    expect(said).not.toContain("got as far as")
    expect(said).not.toContain("The small print")
  })

  it("says how generous the raw counts are when visits straddled a window", () => {
    expect(surfaceOf(drawn(READ_THROUGH, [STRADDLED]).container)).toContain("about 33% higher")
  })

  /**
   * The good answer is said rather than shown as an absence, which is why
   * `settled` is a tone. It is what somebody who lengthened their counting
   * window came here to check.
   */
  it("says there was nothing to divide out rather than going quiet", () => {
    const { container } = drawn(READ_THROUGH, [EXACTLY])

    expect(surfaceOf(container)).toContain("exact rather than an estimate")
    expect(container.querySelector('[data-tone="settled"]')).not.toBeNull()
  })
})

describe("the three nothings and the one refusal", () => {
  /**
   * The only one of the four that is about the deployment rather than the page,
   * and the one worth interrupting for: every rate on this screen has no
   * denominator while the counters look perfectly healthy. Nothing else in this
   * subsystem can tell a deployment that.
   */
  it("raises a notice when nothing is marking the start of a visit", () => {
    const { container } = drawn(READ_THROUGH, [door({ appearances: 12 })])

    expect(container.querySelector('[data-tone="notice"]')).not.toBeNull()
    expect(surfaceOf(container)).toContain("Nothing is saying when a visit to this page begins")
  })

  /**
   * Waiting is the whole of what the other two ask for, so they are lines
   * rather than notices — and the one where the card still draws rates has to
   * say which figure those rates are against.
   */
  it("names the figure it fell back to when nothing counted the arrivals", () => {
    const { container } = drawn(READ_THROUGH, [])

    expect(container.querySelector('[data-tone="notice"]')).toBeNull()
    expect(surfaceOf(container)).toContain("Nothing has counted how many people arrived")
    expect(surfaceOf(container)).toContain("30")
  })

  it("tells readers who arrived from readings nobody has counted yet", () => {
    expect(surfaceOf(drawn([], [door({ opened: 9 })]).container)).toContain(
      "no window of their reading has been counted yet"
    )
  })

  /**
   * A share has no count of people on it while an arrival is waiting, and the
   * reason is said out loud. A reader who meets a share with no count beside it
   * and no explanation assumes a worse reason than the real one.
   */
  it("says why a share has no count of people on it yet", () => {
    const said = surfaceOf(drawn(READ_THROUGH, [door({ opened: 40, appearances: 30 })]).container)

    expect(said).toContain("has not been counted yet")
    expect(said).not.toContain("got as far as")
  })

  /**
   * More reach than there were arrivals is the one figure this screen must
   * never draw. The count is shown, the share is refused, and the remedy is to
   * wait — so the parts are named one click down rather than on the surface.
   */
  it("refuses a share above everybody, and names the parts one click down", () => {
    const { container } = drawn(
      [tally("n_page", { views: 30, reached: 30 }), tally("n_band", { views: 30, reached: 44 })],
      [EXACTLY]
    )

    expect(surfaceOf(container)).toContain("clears itself")
    expect(surfaceOf(container)).not.toContain("n_band")
    expect(recordOf(container)).toContain("n_band")
  })
})

describe("the governing principle", () => {
  /**
   * > Plain language is the default. The technical record is one click away.
   * > Nothing is ever removed.
   */
  it.each([
    ["a page counted exactly", READ_THROUGH, [EXACTLY]],
    ["a page whose visits straddled a window", READ_THROUGH, [STRADDLED]],
    ["a page with no arrival count", READ_THROUGH, [] as readonly StoredPageViews[]],
    ["a page nothing marks the openings of", READ_THROUGH, [door({ appearances: 12 })]],
    ["a page nothing has counted yet", [] as readonly ReaderTally[], [door({ opened: 9 })]],
    ["a page with arrivals still waiting", READ_THROUGH, [door({ opened: 40, appearances: 30 })]],
  ])("says nothing in the runtime's words about %s before it is asked", (_case, tallies, rows) => {
    expect(runtimeWordsIn(surfaceOf(drawn(tallies, rows).container))).toEqual([])
  })

  /**
   * The other half, and the one this lane keeps forgetting to assert: a
   * disclosure that stopped carrying the runtime's own words would be a
   * disclosure failing to be one, and every surface rule above would pass.
   */
  it("keeps both denominators and the straddle one click down", () => {
    const said = recordOf(drawn(READ_THROUGH, [STRADDLED]).container)

    for (const word of ["opened", "appearances", "drift", "pending", "views", "inflation"])
      expect([word, said.includes(word)]).toEqual([word, true])

    expect(said).toContain("revision 4")
  })

  /**
   * The runtime's own sentence for whichever nothing applies, verbatim and one
   * click down. A reader checking the portal's wording against the record needs
   * the record's.
   */
  it("carries the runtime's own line for a nothing, behind a click", () => {
    const { container } = drawn(READ_THROUGH, [])

    expect(recordOf(container)).toContain("no page views have been counted")
    expect(surfaceOf(container)).not.toContain("no page views have been counted")
  })

  it("accounts for the rows the join dropped, one click down", () => {
    const { container } = drawn(READ_THROUGH, [
      EXACTLY,
      door({ revision: 3, opened: 11, appearances: 11 }),
    ])

    expect(recordOf(container)).toContain("filed under another version")
    expect(surfaceOf(container)).not.toContain("dropped")
  })

  it("says nothing about dropped rows when none were dropped", () => {
    expect(recordOf(drawn(READ_THROUGH, [EXACTLY]).container)).not.toContain(
      "filed under another version"
    )
  })

  /**
   * Guards the guard. A sweep whose extractor had stopped seeing one half would
   * report a clean component for ever.
   */
  it("tells the surface and the record apart", () => {
    const { container } = drawn(READ_THROUGH, [EXACTLY])

    expect(surfaceOf(container)).toContain("readers arrived")
    expect(recordOf(container)).not.toContain("readers arrived")
    expect(runtimeWordsIn(recordOf(container)).length).toBeGreaterThan(0)
  })
})
