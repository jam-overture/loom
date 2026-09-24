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
  ["n_page", { name: "the page “Autumn arrivals”", nodeId: "n_page" }],
  ["n_hero", { name: "the card “Autumn arrivals”", nodeId: "n_hero" }],
  ["n_band", { name: "the section “Pick a plan”", nodeId: "n_band" }],
  ["n_buy", { name: "the buy button “Order now”", nodeId: "n_buy" }],
  ["n_foot", { name: "the footer “Built with Loom”", nodeId: "n_foot" }],
  ["n_terms", { name: "the details “Delivery and returns”", nodeId: "n_terms" }],
])

const tally = (
  nodeId: string,
  revision: number,
  counts: Partial<
    Pick<StoredTally, "views" | "reached" | "engaged" | "dwellMs" | "activations" | "opens" | "closes">
  >,
  type = "loom.card"
): StoredTally => ({
  treeId,
  revision,
  nodeId: nodeIdSchema.parse(nodeId),
  type: primitiveTypeSchema.parse(type),
  views: counts.views ?? 0,
  reached: counts.reached ?? 0,
  engaged: counts.engaged ?? 0,
  dwellMs: counts.dwellMs ?? 0,
  activations: counts.activations ?? 0,
  opens: counts.opens ?? 0,
  closes: counts.closes ?? 0,
  updatedAt: "2026-09-15T00:00:00.000Z",
})

/**
 * `live` defaults to the newest counted version, which is the state of a page
 * nobody has touched since it was last counted — and is what every assertion
 * written before the card knew about the page being served was about.
 */
const cardFor = (tallies: readonly StoredTally[], live?: number) => {
  const reading = pageReadings(revisionReadings(tallies, names))[0]!

  return render(
    <PageReadingCard
      reading={reading}
      page={page}
      live={live ?? reading.revisions[0]!.revision}
    />
  )
}

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

/**
 * A page whose senders walk, which is the default and is what makes a region
 * reportable at all. `n_page` and `n_band` are here because a press on
 * `n_buy` is credited to every addressed region it happened inside, up to the
 * root — so the two of them have a use and no clicks of their own, and the
 * button has clicks and no use.
 */
const BUSY: readonly StoredTally[] = [
  tally("n_page", 2, { views: 40, reached: 40, engaged: 20 }, "loom.page"),
  tally("n_hero", 2, { views: 40, reached: 40, dwellMs: 40_000 }),
  tally("n_band", 2, { views: 40, reached: 18, engaged: 12 }, "loom.section"),
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
      screen.getByText(/40 visits to this page have reported back .* That is version 2\./u)
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

  /**
   * The sentence this card could not say. Every other usage figure on it is an
   * event count against one part — *fourteen presses* may be one enthusiastic
   * reader — and *twenty of the forty visits did something* is the claim an
   * author is actually asking for.
   */
  it("says how many visits did anything at all, against the visits it heard from", () => {
    const { container } = cardFor(BUSY)

    expect(container.textContent).toContain("20 of the 40 visits did something on this page")
  })

  /**
   * The root is an ancestor of everything, so the most-used part is the page
   * every time. The one worth naming is the most-used part the measurement can
   * tell *apart* from the page as a whole.
   */
  it("names the part that saw the most of it rather than naming the whole page", () => {
    const { container } = cardFor(BUSY)

    expect(container.textContent).toContain("The part that saw the most of that was")
    expect(container.textContent).toContain("the section “Pick a plan”")
    expect(container.textContent).not.toContain("the page “Autumn arrivals” — 20")
  })

  it("measures a region's use against the visits that got as far as it", () => {
    const { container } = cardFor(BUSY)

    expect(container.textContent).toContain("12 of the 18 visits that got that far")
  })

  /**
   * A region is credited by what happened under it and by nothing else, so a
   * band nobody reported seeing, whose button somebody pressed, has a use and
   * no measured reach. Printing a share of it would be a number above a
   * hundred.
   */
  it("says there is no denominator rather than dividing by a reach nobody reported", () => {
    const { container } = cardFor([
      tally("n_page", 1, { views: 9, reached: 9, engaged: 5 }, "loom.page"),
      tally("n_band", 1, { engaged: 4 }, "loom.section"),
      tally("n_buy", 1, { views: 9, reached: 4, activations: 4 }, "acme.buy-button"),
    ])

    expect(container.textContent).toContain("something in it was used on 4 visits")
    expect(container.textContent).toContain("Nothing reported whether it was ever on screen")
    expect(container.textContent).not.toMatch(/4 of the 0 visits/u)
  })

  /**
   * *Nobody uses my sections* and *nothing told us where anything happened* are
   * opposite news and arrive as the same column of zeroes. A reader who cannot
   * tell them apart goes looking for a fault in their page that is not there.
   */
  it("says so when presses arrived with nothing saying where they happened", () => {
    const { container } = cardFor([
      tally("n_hero", 1, { views: 6, reached: 6 }),
      tally("n_buy", 1, { views: 6, reached: 5, activations: 7 }, "acme.buy-button"),
      tally("n_terms", 1, { views: 6, reached: 4, opens: 2, closes: 1 }, "loom.details"),
    ])

    expect(container.textContent).toContain("10 clicks and openings were reported on this page")
    expect(container.textContent).toContain("not one of them said which part of the page")
    expect(container.textContent).toContain("That is the pages reporting back, not your readers")
  })

  it("counts one unplaced press as a click rather than as 1 clicks", () => {
    const { container } = cardFor([
      tally("n_buy", 1, { views: 2, reached: 2, activations: 1 }, "acme.buy-button"),
    ])

    expect(container.textContent).toContain("1 click or opening was reported")
  })

  it("does not say it when one press was placed, because one placed press means the walk works", () => {
    const { container } = cardFor([
      tally("n_page", 1, { views: 6, reached: 6, engaged: 1 }, "loom.page"),
      tally("n_buy", 1, { views: 6, reached: 5, activations: 7 }, "acme.buy-button"),
    ])

    expect(container.textContent).not.toContain("clicks and openings were reported on this page")
    expect(container.textContent).toContain("1 of the 6 visits did something on this page")
  })

  it("does not say it on a page nobody used, which already has its own sentence", () => {
    const { container } = cardFor([
      tally("n_hero", 1, { views: 6, reached: 6 }),
      tally("n_foot", 1, { views: 6, reached: 2 }, "loom.footer"),
    ])

    expect(container.textContent).toContain("Nobody clicked or opened anything")
    expect(container.textContent).not.toContain("reported on this page")
  })

  /** The name of the thing to fix, where the person who can fix it will look. */
  it("keeps what an unplaced press is missing one click down, and never further", () => {
    const { container } = cardFor([
      tally("n_buy", 1, { views: 6, reached: 5, activations: 7 }, "acme.buy-button"),
    ])

    const disclosed = [...container.querySelectorAll("details")]
      .map((details) => details.textContent ?? "")
      .join(" ")

    expect(disclosed).toContain("within")
    expect(disclosed).toContain("broadcastReaderSignals")

    for (const details of container.querySelectorAll("details")) details.remove()

    expect(container.textContent).not.toContain("broadcastReaderSignals")
  })

  it("keeps every part's own use one click down, beside the counters it belongs with", () => {
    const { container } = cardFor(BUSY)
    const table = container.querySelector("details table")

    expect(table?.textContent).toContain("used inside")
    expect([...(table?.querySelectorAll("tbody tr") ?? [])].map((row) => row.textContent)).toHaveLength(6)
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
    expect(container.textContent).toContain("Version 2 against version 1")
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

  /**
   * It used to say nothing at all, which is the defect. Three different facts
   * arrived as one blank section — nothing has been changed yet, the change
   * replaced everything, the change is too new to have been counted — and a
   * reader cannot act on a blank.
   */
  it("says there is nothing before this version rather than dropping the section", () => {
    const { container } = cardFor(BUSY)

    expect(container.textContent).toContain("What the last change did to your readers")
    expect(container.textContent).toContain("Nobody has reported on an earlier version")
    expect(container.textContent).toContain("Your next change to this page is what gives")
  })

  it("says why there is nothing to compare when the change replaced every reported part", () => {
    const { container } = cardFor([
      tally("n_hero", 1, { views: 50, reached: 10 }),
      tally("n_terms", 2, { views: 40, reached: 32 }, "loom.details"),
    ])

    expect(container.textContent).toContain("not one part was reported on by both versions")
    expect(container.textContent).toContain("different from nothing having moved")
  })

  /**
   * *The last change* is a claim about the page being served. When the counters
   * are behind it, the comparison is real and is about an earlier pair.
   */
  it("stops calling the comparison the last change when the counters are behind the page", () => {
    const { container } = cardFor(TWO_REVISIONS, 5)

    expect(container.textContent).toContain("What the last counted change did to your readers")
    expect(container.textContent).toContain("up 60 points")
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
