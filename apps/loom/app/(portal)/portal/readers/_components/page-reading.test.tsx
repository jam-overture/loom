import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { nodeIdSchema, primitiveTypeSchema, treeIdSchema } from "@loom/runtime"
import type { StoredTally } from "@loom/runtime/signals"

import type { PageName } from "@/app/(portal)/_lib/page-name"
import type { PartName } from "@/app/(portal)/_lib/part-name"
import { pageReadings, revisionReadings } from "@/app/(portal)/_lib/reading-view"

import { PageReadingCard } from "./page-reading"

const treeId = treeIdSchema.parse("t_seed1")

const page: PageName = { name: "Autumn arrivals", treeId, derived: true }

const names: ReadonlyMap<string, PartName> = new Map([
  ["n_hero", { name: "the card “Autumn arrivals”", nodeId: "n_hero" }],
  ["n_buy", { name: "the buy button “Order now”", nodeId: "n_buy" }],
  ["n_foot", { name: "the footer “Built with Loom”", nodeId: "n_foot" }],
  ["n_terms", { name: "the details “Delivery and returns”", nodeId: "n_terms" }],
])

const tally = (
  nodeId: string,
  revision: number,
  counts: Partial<Pick<StoredTally, "views" | "reached" | "dwellMs" | "activations" | "opens" | "closes">>,
  type = "loom.card"
): StoredTally => ({
  treeId,
  revision,
  nodeId: nodeIdSchema.parse(nodeId),
  type: primitiveTypeSchema.parse(type),
  views: counts.views ?? 0,
  reached: counts.reached ?? 0,
  dwellMs: counts.dwellMs ?? 0,
  activations: counts.activations ?? 0,
  opens: counts.opens ?? 0,
  closes: counts.closes ?? 0,
  updatedAt: "2026-09-15T00:00:00.000Z",
})

const cardFor = (tallies: readonly StoredTally[]) =>
  render(
    <PageReadingCard reading={pageReadings(revisionReadings(tallies, names))[0]!} page={page} />
  )

/**
 * The comparison block alone. Reading the whole card would find every part in
 * the counter table below it, which is exactly the list this is asserting is
 * *not* what gets compared.
 */
const sinceTheChange = (container: HTMLElement): string => {
  const heading = [...container.querySelectorAll("h3")].find(
    (element) => element.textContent === "What the last change did to your readers"
  )

  return heading?.closest("section")?.querySelector("ul")?.textContent ?? ""
}

const BUSY: readonly StoredTally[] = [
  tally("n_hero", 2, { views: 40, reached: 40, dwellMs: 40_000 }),
  tally("n_terms", 2, { views: 40, reached: 22, dwellMs: 22_000, opens: 9, closes: 4 }, "loom.details"),
  tally("n_buy", 2, { views: 40, reached: 18, dwellMs: 90_000, activations: 14 }, "acme.buy-button"),
  tally("n_foot", 2, { views: 40, reached: 3, dwellMs: 900 }, "loom.footer"),
]

/**
 * The rule the whole surface is built on, asserted rather than trusted: **plain
 * language is the default, the technical record is one click away, and nothing
 * is ever removed.** Every counter the rollup keeps is still rendered; the test
 * finds it inside a closed `<details>`, which is where a reader's own
 * find-in-page finds it too.
 */
describe("PageReadingCard", () => {
  it("says how many visits it heard from, and which version of the page they were on", () => {
    cardFor(BUSY)

    expect(
      screen.getByText(/40 visits to this page have reported back .* That is revision 2\./u)
    ).not.toBeNull()
  })

  it("counts one visit as a visit rather than as 1 visits", () => {
    cardFor([tally("n_hero", 1, { views: 1, reached: 1 })])

    expect(screen.getByText(/One visit to this page has reported back/u)).not.toBeNull()
  })

  it("names the part fewest people got to, in a person's words", () => {
    const { container } = cardFor(BUSY)

    expect(container.textContent).toContain("Fewest people got as far as")
    expect(container.textContent).toContain("the footer “Built with Loom”")
    expect(container.textContent).toContain("3 of the 40 visits")
  })

  it("says what to do about it", () => {
    const { container } = cardFor(BUSY)

    expect(container.textContent).toContain("worth moving up")
  })

  it("names where people stayed longest per person, not where they stayed longest in total", () => {
    const { container } = cardFor(BUSY)

    expect(container.textContent).toMatch(/People stayed longest on the buy button/u)
    expect(container.textContent).toContain("about 5 seconds each")
  })

  it("names what was clicked most and what was opened most", () => {
    const { container } = cardFor(BUSY)

    expect(container.textContent).toContain("was clicked 14 times")
    expect(container.textContent).toContain("was opened 9 times")
  })

  /**
   * A section that silently disappears leaves a reader unable to tell *Loom
   * looked and there was nothing* from *Loom did not look*.
   */
  it("says so in words when nobody clicked or opened anything", () => {
    const { container } = cardFor([
      tally("n_hero", 1, { views: 6, reached: 6 }),
      tally("n_foot", 1, { views: 6, reached: 2 }, "loom.footer"),
    ])

    expect(container.textContent).toContain("Nobody clicked or opened anything")
  })

  it("says so in words when every part was seen by as many people as every other", () => {
    const { container } = cardFor([
      tally("n_hero", 1, { views: 6, reached: 6 }),
      tally("n_foot", 1, { views: 6, reached: 6 }, "loom.footer"),
    ])

    expect(container.textContent).toContain("Nothing here is being scrolled past")
  })

  /** The governing rule, measured with every disclosure taken away. */
  it("prints no registered type on the surface", () => {
    const { container } = cardFor(BUSY)

    for (const details of container.querySelectorAll("details")) details.remove()

    expect(container.textContent).not.toContain("loom.")
    expect(container.textContent).not.toContain("acme.")
  })

  it("keeps every registered type it used to print, one click down", () => {
    const { container } = cardFor(BUSY)
    const disclosed = [...container.querySelectorAll("details")]
      .map((details) => details.textContent ?? "")
      .join(" ")

    for (const type of ["loom.card", "loom.details", "acme.buy-button", "loom.footer"]) {
      expect(disclosed).toContain(type)
    }
  })

  /**
   * 22 August settled that identity is not technical detail: an id is the one
   * thing a reviewer pastes into another screen, and every other screen in this
   * portal keeps it beside the name.
   */
  it("keeps each part's id beside its name on the surface", () => {
    const { container } = cardFor(BUSY)

    for (const details of container.querySelectorAll("details")) details.remove()

    expect(container.textContent).toContain("n_foot")
  })

  it("keeps the raw milliseconds the wording rounded, one click down", () => {
    const { container } = cardFor(BUSY)
    const disclosed = [...container.querySelectorAll("details")]
      .map((details) => details.textContent ?? "")
      .join(" ")

    expect(disclosed).toContain("5000ms")
  })

  it("leads to the page it is about", () => {
    cardFor(BUSY)

    expect(screen.getByText("Look at this page →").getAttribute("href")).toBe(
      "/portal/pages/t_seed1"
    )
  })
})

describe("what the last change did", () => {
  const TWO_REVISIONS: readonly StoredTally[] = [
    tally("n_buy", 1, { views: 50, reached: 10 }, "acme.buy-button"),
    tally("n_hero", 1, { views: 50, reached: 50 }),
    tally("n_buy", 2, { views: 40, reached: 32 }, "acme.buy-button"),
    tally("n_hero", 2, { views: 40, reached: 40 }),
  ]

  it("compares the newest version against the one before it", () => {
    const { container } = cardFor(TWO_REVISIONS)

    expect(container.textContent).toContain("What the last change did to your readers")
    expect(container.textContent).toContain("Revision 2 against revision 1")
  })

  it("says which way each part moved, with both counts beside it", () => {
    const { container } = cardFor(TWO_REVISIONS)

    expect(container.textContent).toContain("up 60 points")
    expect(container.textContent).toContain("10 of the 50 visits before, then 32 of the 40 visits")
  })

  /**
   * A comparison whose caveat is unfindable is a comparison that lies. The
   * broadcaster files under the revision it started on — a known gap in the
   * runtime, and not this portal's to close (0018) — so the screen refuses to
   * hide it.
   */
  it("keeps the reason a comparison can be wrong one click down, and never further", () => {
    const { container } = cardFor(TWO_REVISIONS)
    const disclosed = [...container.querySelectorAll("details")]
      .map((details) => details.textContent ?? "")
      .join(" ")

    expect(disclosed).toContain("goes on filing under the revision they arrived on")
  })

  it("says nothing about a change when there is only one version to go on", () => {
    const { container } = cardFor(BUSY)

    expect(container.textContent).not.toContain("What the last change did")
  })

  /**
   * A part the change added has nothing on the other side to be compared with,
   * and a zero there would show a collapse that never happened.
   */
  it("leaves out a part that only one of the two versions heard about", () => {
    const { container } = cardFor([
      ...TWO_REVISIONS,
      tally("n_terms", 2, { views: 40, reached: 12 }, "loom.details"),
    ])
    const since = sinceTheChange(container)

    expect(since).toContain("the buy button “Order now”")
    expect(since).not.toContain("the details “Delivery and returns”")
  })
})
