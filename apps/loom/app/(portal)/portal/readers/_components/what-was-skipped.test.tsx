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
import { PART_STANDINGS, type ReaderTally } from "@jam-overture/loom/signals"

import { runtimeWordsIn } from "@/app/(portal)/_test/plain-language"
import { recordOf, surfaceOf } from "@/app/(portal)/_test/rendered"
import { skippingOf, type PageSkipping } from "@/app/(portal)/_lib/skipped"
import { plainStanding } from "@/app/(portal)/_lib/vocabulary"

import { SkippingUnavailable, WhatWasSkipped } from "./what-was-skipped"

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
    element("n_hero", "loom.card", [text("n_words", "Autumn arrivals")]),
    element("n_band", "loom.card", []),
    element("n_foot", "loom.card", []),
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

const reading = (tallies: readonly ReaderTally[]): PageSkipping =>
  skippingOf(PAGE, tallies, DECLARED)

const drawn = (tallies: readonly ReaderTally[]) =>
  render(<WhatWasSkipped skipping={reading(tallies)} />)

/** A page read to the hero and no further, which is the case worth drawing. */
const DROPS_OFF: readonly ReaderTally[] = [
  tally("n_page", { views: 30, reached: 30 }),
  tally("n_hero", { views: 30, reached: 27 }),
]

const READ_THROUGH: readonly ReaderTally[] = [
  tally("n_page", { views: 30, reached: 30 }),
  tally("n_hero", { views: 30, reached: 27 }),
  tally("n_band", { views: 30, reached: 19 }),
  tally("n_foot", { views: 30, reached: 11 }),
]

describe("the list a reader meets", () => {
  it("names every part of the page, in the order it is read", () => {
    const { container } = drawn(DROPS_OFF)
    const rows = [...container.querySelectorAll("li")].map((row) => row.textContent ?? "")

    expect(rows).toHaveLength(4)
    expect(rows[0]).toContain("n_page")
    expect(rows[1]).toContain("n_hero")
    expect(rows[2]).toContain("n_band")
    expect(rows[3]).toContain("n_foot")
  })

  /**
   * The finding, on the surface and before the evidence for it. A reader who
   * met the rows first would be doing the reading the module already did.
   */
  it("says where the reading stops before it lists anything", () => {
    const { container } = drawn(DROPS_OFF)
    const said = surfaceOf(container)

    expect(said).toContain("Reading stops at")
    expect(said.indexOf("Reading stops at")).toBeLessThan(said.indexOf("Nobody got to it"))
  })

  it("leads with a plain word for each part and keeps the runtime's beside it", () => {
    const { container } = drawn(DROPS_OFF)

    expect(surfaceOf(container)).toContain(plainStanding("skipped").label)
    expect(surfaceOf(container)).not.toContain("skipped")
    expect(recordOf(container)).toContain("skipped")
  })

  /**
   * A count on the surface always carries its denominator. *27* on its own is
   * not news; *27 of 30 visits* is.
   */
  it("gives a reached count its denominator", () => {
    expect(surfaceOf(drawn(DROPS_OFF).container)).toContain("27 of 30 visits")
  })

  /** A part nobody got to has no count to give, and must not print a zero. */
  it("prints no figure against a part nothing was counted about", () => {
    const rows = [...drawn(DROPS_OFF).container.querySelectorAll("li")]
    const foot = rows.find((row) => (row.textContent ?? "").includes("n_foot"))

    expect(foot?.textContent).not.toContain("0 of 30")
  })

  it("keeps the page's own nesting rather than flattening it", () => {
    const { container } = drawn(READ_THROUGH)
    const rows = [...container.querySelectorAll("li")]

    expect(rows[0]?.style.paddingInlineStart).toBe("0rem")
    expect(rows[1]?.style.paddingInlineStart).toBe("0.75rem")
  })

  it("says a page nothing was missed on was not missed, rather than saying nothing", () => {
    expect(surfaceOf(drawn(READ_THROUGH).container)).toContain(
      "Nothing on this page is being scrolled past"
    )
  })

  it("offers no reassurance about a page no visit reported on", () => {
    const said = surfaceOf(drawn([]).container)

    expect(said).not.toContain("Nothing on this page is being scrolled past")
    expect(said).toContain("No visit has reported anything")
  })

  /**
   * The one reading here that is about the page's wiring rather than its
   * readers, and telling somebody *nobody scrolled* would send them to rewrite
   * a page that is fine.
   */
  it("says so when visits reported in and nothing reported being on screen", () => {
    const said = surfaceOf(drawn([tally("n_page", { views: 40, reached: 0, engaged: 4 })]).container)

    expect(said).toContain("reporting its visits and not its parts")
  })
})

describe("the counters that are not about this page", () => {
  const MISMATCHED: readonly ReaderTally[] = [
    tally("n_page", { views: 8, reached: 8 }),
    tally("n_gone", { views: 8, reached: 8 }),
  ]

  /**
   * The alarm replaces the list rather than sitting under it. Both at one
   * altitude would be a reading and a reason not to believe it, and the reading
   * would win.
   */
  it("draws no list at all", () => {
    const { container } = render(<WhatWasSkipped skipping={reading(MISMATCHED)} />)

    expect(container.querySelectorAll("li")).toHaveLength(0)
    expect(surfaceOf(container)).toContain("aren’t about the page we have")
  })

  it("names the parts that prove the pair is wrong, one click down", () => {
    const { container } = render(<WhatWasSkipped skipping={reading(MISMATCHED)} />)

    expect(surfaceOf(container)).not.toContain("n_gone")
    expect(recordOf(container)).toContain("n_gone")
  })

  it("accounts for the rows it dropped, one click down and not on the surface", () => {
    const { container } = drawn([
      ...DROPS_OFF,
      tally("n_band", { revision: 3, views: 8, reached: 8 }),
      tally("n_page", { views: 30, reached: 1 }),
    ])

    expect(recordOf(container)).toContain("filed under another tree or another")
    expect(recordOf(container)).toContain("handed in more than once")
    expect(surfaceOf(container)).not.toContain("dropped")
  })

  it("says nothing about dropped rows when none were dropped", () => {
    const said = recordOf(drawn(DROPS_OFF).container)

    expect(said).not.toContain("were dropped by the join")
    expect(said).not.toContain("handed in more than once")
  })
})

describe("the version the counters are about", () => {
  /**
   * The absence is explained rather than performed. A section that disappeared
   * would leave a reader unable to tell *Loom looked* from *Loom did not look*.
   */
  it("says why there is no reading when the page has moved on", () => {
    const { container } = render(<SkippingUnavailable counted={4} live={6} />)
    const said = surfaceOf(container)

    expect(said).toContain("version 4")
    expect(said).toContain("version 6")
    expect(said).toContain("so nothing is shown instead")
  })

  /**
   * A failed read of the page is a different fact from a page that has moved
   * on, and the two send a reader to opposite places — *try again* against
   * *wait for the next window*.
   */
  it("keeps a failed read of the page apart from a page that has moved on", () => {
    const said = surfaceOf(render(<SkippingUnavailable counted={4} live={undefined} />).container)

    expect(said).toContain("didn’t come back")
    expect(said).not.toContain("version 4")
  })

  it("promises that nothing has been lost, in both cases", () => {
    for (const live of [6, undefined]) {
      const { container } = render(<SkippingUnavailable counted={4} live={live} />)

      expect(recordOf(container)).toContain("Nothing is lost in the meantime")
    }
  })
})

describe("the governing principle", () => {
  /**
   * > Plain language is the default. The technical record is one click away.
   * > Nothing is ever removed.
   *
   * Asserted on the surface and on the record separately, because the only
   * interesting question is which half a word is in.
   */
  it.each([
    ["a page that drops off", DROPS_OFF],
    ["a page read to the bottom", READ_THROUGH],
    ["a page nothing was counted about", [] as readonly ReaderTally[]],
  ])("says nothing in the runtime's words about %s before it is asked", (_case, tallies) => {
    expect(runtimeWordsIn(surfaceOf(drawn(tallies).container))).toEqual([])
  })

  it("says nothing in the runtime's words on either notice before it is asked", () => {
    for (const live of [6, undefined]) {
      const { container } = render(<SkippingUnavailable counted={4} live={live} />)

      expect(runtimeWordsIn(surfaceOf(container))).toEqual([])
    }
  })

  it("says nothing in the runtime's words about a mismatched pair before it is asked", () => {
    const { container } = render(
      <WhatWasSkipped
        skipping={reading([
          tally("n_page", { views: 8, reached: 8 }),
          tally("n_gone", { views: 8, reached: 8 }),
        ])}
      />
    )

    expect(runtimeWordsIn(surfaceOf(container))).toEqual([])
  })

  /**
   * The other half, and it is the half this lane keeps forgetting to assert: a
   * disclosure that stopped carrying the runtime's own words would be a
   * disclosure failing to be one, and every surface rule above would still pass.
   */
  it("keeps the whole runtime vocabulary one click down", () => {
    const said = recordOf(drawn(DROPS_OFF).container)

    for (const standing of PART_STANDINGS) expect(said).toContain(standing)
    expect(said).toContain("revision")
    expect(said).toContain("views")
  })

  it("explains what the visit figure is, because it is a floor and not a count", () => {
    expect(recordOf(drawn(DROPS_OFF).container)).toContain("a floor rather than a count")
  })

  /**
   * Guards the guard. A sweep whose extractor had stopped seeing the surface,
   * or the record, would report a clean component for ever.
   */
  it("tells the surface and the record apart", () => {
    const { container } = drawn(DROPS_OFF)

    expect(surfaceOf(container)).toContain("Reading stops at")
    expect(recordOf(container)).not.toContain("Reading stops at")
    expect(runtimeWordsIn(recordOf(container)).length).toBeGreaterThan(0)
  })
})
