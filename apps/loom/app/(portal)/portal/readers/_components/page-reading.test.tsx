import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  nodeIdSchema,
  primitiveTypeSchema,
  treeIdSchema,
  type ElementNode,
  type LoomNode,
  type LoomTree,
} from "@jam-overture/loom"
import { pageActionOf, pageReadingOf, type StoredTally } from "@jam-overture/loom/signals"

import type { PageName } from "@/app/(portal)/_lib/page-name"
import type { PartName } from "@/app/(portal)/_lib/part-name"
import { pageReadings, revisionReadings } from "@/app/(portal)/_lib/reading-view"
import type { PageArrivals } from "@/app/(portal)/_lib/arrivals"
import { doingOf, type PageDoing } from "@/app/(portal)/_lib/doing"
import type { PageSkipping } from "@/app/(portal)/_lib/skipped"
import type { PagePacing } from "@/app/(portal)/_lib/pacing"
import type { PageStopping } from "@/app/(portal)/_lib/stopping"

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
    Pick<
      StoredTally,
      "views" | "reached" | "engaged" | "dwellMs" | "activations" | "opens" | "closes" | "completions"
    >
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
  completions: counts.completions ?? 0,
  updatedAt: "2026-09-15T00:00:00.000Z",
})

/**
 * `live` defaults to the newest counted version, which is the state of a page
 * nobody has touched since it was last counted — and is what every assertion
 * written before the card knew about the page being served was about.
 */
const cardFor = (
  tallies: readonly StoredTally[],
  live?: number,
  skipping?: PageSkipping,
  stopping?: PageStopping,
  pacing?: PagePacing,
  arrivals?: PageArrivals
) => {
  const reading = pageReadings(revisionReadings(tallies, names))[0]!

  return render(
    <PageReadingCard
      reading={reading}
      page={page}
      live={live ?? reading.revisions[0]!.revision}
      /*
       * Absent unless a case is about it, which is the state of every card on a
       * deployment whose counted version is not the one being served — and is
       * what every assertion written before this card knew which parts a page
       * has is about.
       */
      skipping={skipping}
      /*
       * Absent in exactly the same cases and for the same reason: it is the
       * other reading off the same join, so a card without the one has neither.
       */
      stopping={stopping}
      /*
       * And absent in the same cases again, off the same join: whether the
       * people who got to a part had time to read its words.
       */
      pacing={pacing}
      /*
       * And absent in the same cases again: how many people there were to have
       * done any of it. It is the denominator the other three divide by, and a
       * card without the join has none of the four.
       */
      arrivals={arrivals}
      /*
       * And present on every card, because it is the one reading here that
       * needs the page only to *name* what it is about. The others are
       * withheld on a version gap; this is given, and the tests about the gap
       * hand it nothing explicitly.
       */
      doing={doingFor(tallies)}
    />
  )
}

/**
 * The page these counters were filed against, for the one reading that needs a
 * page as well as a window.
 *
 * Every region here holds an element part, which is what makes a share of
 * readers a measurement of it, and `n_buy` holds only words — so it is the one
 * part on this page whose nought is a filing rule rather than a finding about
 * anybody. The ids are the ones the names above are for, because a reading
 * joined to a different page would name every part from its registered type and
 * every assertion about a name below would be about the fallback.
 */
const node = (id: string): LoomNode => ({
  kind: "text",
  id: nodeIdSchema.parse(id),
  value: "words",
})

const region = (
  id: string,
  primitive: string,
  children: readonly LoomNode[]
): ElementNode => ({
  kind: "element",
  id: nodeIdSchema.parse(id),
  type: primitiveTypeSchema.parse(primitive),
  props: {},
  children,
})

const words = (id: string): ElementNode => region(id, "loom.prose", [node(`${id}text`)])

/**
 * At the version the counters were filed under, because a window laid over
 * another version of the page is the one way this reading can be wrong and look
 * right. The screen refuses the pair outright (`skippingComparable`); here the
 * page is simply built at the revision the case is about.
 */
const pageAt = (revision: number): LoomTree => ({
  schemaVersion: 1,
  treeId,
  revision,
  root: region("n_page", "loom.page", [
    region("n_hero", "loom.card", [words("n_herowords")]),
    region("n_band", "loom.section", [
      words("n_bandwords"),
      region("n_buy", "acme.buy-button", [node("n_buytext")]),
    ]),
    region("n_terms", "loom.details", [words("n_termswords")]),
    region("n_foot", "loom.footer", [words("n_footwords")]),
  ]),
})

const DECLARED = { copyFor: () => undefined, typesWithRole: () => [] }

/**
 * What readers did, joined the way the screen joins it.
 *
 * Built from the real reading rather than written as a literal — unlike
 * {@link ARRIVED} below, and the difference is what each one is pinning. The
 * arrivals literal exists because the card's job with it is to choose a line;
 * this reading's structural half, which part bears others, cannot be faked
 * without faking the thing the section is about.
 */
const doingFor = (tallies: readonly StoredTally[]): PageDoing =>
  doingOf(
    pageActionOf(pageReadingOf(pageAt(tallies[0]?.revision ?? 1), tallies, DECLARED)),
    names
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
 * How many people there were, as the card is handed it.
 *
 * Written as a literal rather than joined from a page, because what is being
 * pinned here is what the **card** does with the reading — which line it draws
 * and which it drops — and `_lib/arrivals.test.ts` is where the arithmetic
 * that produces one is held. Thirty-two readers against forty counted visits
 * is a deployment with a straddle in it, which is the ordinary case.
 */
const ARRIVED: PageArrivals = {
  treeId,
  revision: 2,
  arrived: 32,
  counted: 40,
  pending: 0,
  drift: 8,
  inflation: 0.25,
  exact: false,
  floor: 40,
  silence: undefined,
  parts: [],
  fewestGotTo: {
    nodeId: nodeIdSchema.parse("n_foot"),
    name: names.get("n_foot")!,
    type: primitiveTypeSchema.parse("loom.footer"),
    depth: 1,
    reached: 3,
    share: 3 / 40,
    atMost: 3 / 32,
    readers: (3 * 32) / 40,
    atMostReaders: 3,
    unreconciled: false,
  },
  unreconciled: [],
  foreign: 0,
  duplicated: 0,
  countedAt: "2026-10-07T09:12:00.000Z",
}

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

    expect(container.textContent).toContain("fewest got as far as")
    expect(container.textContent).toContain("the footer “Built with Loom”")
    expect(container.textContent).toContain("3 of the 40 visits")
  })

  /**
   * **One part, one figure, one denominator.**
   *
   * The same sentence in the same position, divided by the readers who arrived
   * instead of by the largest visit count a single row of the window reports.
   * The first photograph of this branch had the card saying both — *3 of the 40
   * visits* in this line and *about 2 of the 32 readers* in a section three
   * lines above it — and that is worse than either sentence on its own.
   */
  it("names the part fewest people got to in people, where it knows how many there were", () => {
    const { container } = cardFor(BUSY, undefined, undefined, undefined, undefined, ARRIVED)

    expect(container.textContent).toContain("Of those 32, about 2 readers got as far as")
    expect(container.textContent).toContain("the footer “Built with Loom”")
    expect(container.textContent).not.toContain("3 of the 40 visits")
  })

  /**
   * And the section that establishes the denominator is **above** the line that
   * uses it. A correction a reader reaches after the conclusion is a correction
   * that arrives too late, which is the whole argument for this reading's
   * position on the card.
   */
  it("says how many people there were before any figure drawn against them", () => {
    const { container } = cardFor(BUSY, undefined, undefined, undefined, undefined, ARRIVED)
    const said = container.textContent ?? ""

    expect(said).toContain("32 readers arrived at version 2 of this page")
    expect(said.indexOf("32 readers arrived")).toBeLessThan(said.indexOf("Of those 32, about 2"))
  })

  it("draws nothing of it on a card that was handed no arrival count", () => {
    const said = cardFor(BUSY).container.textContent ?? ""

    expect(said).not.toContain("How many people were there?")
    expect(said).toContain("3 of the 40 visits")
  })

  /**
   * **The advice that used to end that sentence is gone, and this is the test
   * that used to pin it.**
   *
   * It read *"If anything on this page is worth moving up, it is what sits
   * above that."* — drawn from a page-wide minimum, which
   * [0221](../../../../../../../decisions/0221-where-reading-stops-is-a-fall-between-two-siblings-and-a-ratio-of-two-counts-off-one-row-set.md)
   * is explicit does not support a claim about reading order: a part three
   * levels inside the first band comes before the second band and is reached by
   * fewer visits than either, so the part with the smallest reach is routinely a
   * part nothing stopped at. On `BUSY` it is the footer, and the footer is the
   * last part of the page — there is nothing below it for anybody to have
   * failed to reach.
   *
   * `WhereTheyStop` makes the same recommendation between two siblings, which is
   * the only comparison that supports one. **The number the old advice was drawn
   * from is untouched** and is asserted directly above; what went is an
   * inference, and an inference is not a fact a reader loses.
   */
  it("no longer says which part to move up from a page-wide smallest reach", () => {
    const { container } = cardFor(BUSY)

    expect(container.textContent).toContain("fewest got as far as")
    expect(container.textContent).not.toContain("worth moving up")
  })

  /**
   * And the sound version of it, when the card is handed the reading that can
   * make it. The card draws nothing at all where it is not — one notice already
   * says why, and two would read as two faults.
   */
  it("draws where people stop when it is handed that reading, and nothing when it is not", () => {
    expect(cardFor(BUSY).container.textContent).not.toContain("Where do people stop reading?")

    const drawn = cardFor(BUSY, undefined, undefined, {
      treeId,
      revision: 2,
      views: 40,
      runs: [],
      steepest: undefined,
      places: 0,
      unanchored: [],
      gained: 0,
    })

    expect(drawn.container.textContent).toContain("Where do people stop reading?")
  })

  it("names where people stayed longest per person, not where they stayed longest in total", () => {
    const { container } = cardFor(BUSY)

    expect(container.textContent).toMatch(/People stayed longest on the buy button/u)
    expect(container.textContent).toContain("about 5 seconds each")
  })

  it("names what was pressed most and what was opened most", () => {
    const { container } = cardFor(BUSY)

    expect(container.textContent).toContain("was pressed 14 times")
    expect(container.textContent).toContain("was opened out 9 times")
  })

  /**
   * A section that silently disappears leaves a reader unable to tell *Loom
   * looked and there was nothing* from *Loom did not look*.
   */
  it("says so in words when nobody pressed or opened anything", () => {
    const { container } = cardFor([
      tally("n_hero", 1, { views: 6, reached: 6 }),
      tally("n_foot", 1, { views: 6, reached: 2 }, "loom.footer"),
    ])

    expect(container.textContent).toContain("looking at this page rather than using it")
  })

  it("says so in words when every part was seen by as many people as every other", () => {
    const { container } = cardFor([
      tally("n_hero", 1, { views: 6, reached: 6 }),
      tally("n_foot", 1, { views: 6, reached: 6 }, "loom.footer"),
    ])

    expect(container.textContent).toContain("seen by about as many of them as every other")
  })

  /**
   * **A sentence read off rows may not make a claim about the page.**
   *
   * Every figure in this list comes from a counter, and a part nobody got to
   * has no counter — so *nothing here is being scrolled past* was a statement
   * about parts that had reported, printed as a statement about the page. It
   * was true of its own evidence and wrong about its subject, and it stayed
   * that way until a reading that knows the page existed to contradict it.
   *
   * The claim is made in exactly one place now, by the one reading that holds
   * the page as well as the counters.
   */
  it.each([
    ["every part equally seen", [tally("n_hero", 1, { views: 6, reached: 6 }), tally("n_foot", 1, { views: 6, reached: 6 }, "loom.footer")]],
    ["one part seen less", [tally("n_hero", 1, { views: 6, reached: 6 }), tally("n_foot", 1, { views: 6, reached: 2 }, "loom.footer")]],
  ])("never claims the page is unskipped from the counters alone — %s", (_case, tallies) => {
    const { container } = cardFor(tallies)

    expect(container.textContent).not.toContain("is being scrolled past")
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
  it("says how many visits did anything at all, against the visits that got there", () => {
    const { container } = cardFor(BUSY)

    expect(container.textContent).toContain("20 of the 40 visits that got here did something on this page")
  })

  /**
   * The root is an ancestor of everything, so the most-used part is the page
   * every time. The one worth naming is the most-used part the measurement can
   * tell *apart* from the page as a whole.
   */
  it("names the part that saw the most of it rather than naming the whole page", () => {
    const { container } = cardFor(BUSY)

    expect(container.textContent).toContain("The part of the page that saw the most of that was")
    expect(container.textContent).toContain("the section “Pick a plan”")
    expect(container.textContent).not.toContain("the page “Autumn arrivals” — 20")
  })

  it("measures a region's use against the visits that got as far as it", () => {
    const { container } = cardFor(BUSY)

    expect(container.textContent).toContain("12 of the 18 visits that got that far")
  })

  /**
   * **The sentence this card could not say at all.**
   *
   * Every usage figure on it was a presence — what was pressed, what was
   * opened, which region saw the most of it — so a band readers reach in
   * numbers and never touch looked exactly like the heading above it, because
   * both reported nought. What tells them apart is structural: an action is
   * credited to the regions it happened *inside*, so a part with nothing inside
   * it has a nought that is a filing rule and not a finding about anybody.
   */
  it("names the region readers reach and never touch, and never a part with nothing inside it", () => {
    const { container } = cardFor(BUSY)

    expect(container.textContent).toContain("Readers get to the card “Autumn arrivals”")
    expect(container.textContent).toContain("and do nothing in it — 40 visits got that far")
    expect(container.textContent).toContain("not one of them pressed, followed or opened anything inside it")
    expect(container.textContent).not.toContain("Readers get to the buy button")
  })

  /**
   * Good news, said rather than shown as an absence — the reason the `settled`
   * tone exists. It is the answer somebody who came here worried about a dead
   * section wants, and it must not arrive as a missing line.
   */
  it("says so out loud when every region readers got to was used by somebody", () => {
    const { container } = cardFor([
      tally("n_page", 1, { views: 9, reached: 9, engaged: 5 }, "loom.page"),
      tally("n_hero", 1, { views: 9, reached: 9, engaged: 4 }),
    ])

    expect(container.textContent).toContain("no section here that readers reach and never touch")
  })

  /**
   * Where the withheld shares went, which on an ordinary page is most of it.
   * What is withheld is still reported as a total: a reader who sees shares on
   * four parts of a nine-part page is owed the sentence that accounts for the
   * rest.
   */
  it("accounts for the parts whose share is withheld rather than leaving a gap", () => {
    const { container } = cardFor(BUSY)

    expect(container.textContent).toContain("nothing inside them")
    expect(container.textContent).toContain("there is no inside to a word")
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

    expect(container.textContent).toContain("4 visits used something in it")
    expect(container.textContent).toContain("nothing reported whether it was ever on screen")
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

    expect(container.textContent).toContain(
      "10 presses, openings and submissions were reported on this page"
    )
    expect(container.textContent).toContain("not one of them said which part of the page")
    expect(container.textContent).toContain("That is the pages reporting back, not your readers")
  })

  it("counts one unplaced press as a press rather than as 1 presses", () => {
    const { container } = cardFor([
      tally("n_buy", 1, { views: 2, reached: 2, activations: 1 }, "acme.buy-button"),
    ])

    expect(container.textContent).toContain("1 press, opening or submission was reported")
  })

  it("does not say it when one press was placed, because one placed press means the walk works", () => {
    const { container } = cardFor([
      tally("n_page", 1, { views: 6, reached: 6, engaged: 1 }, "loom.page"),
      tally("n_buy", 1, { views: 6, reached: 5, activations: 7 }, "acme.buy-button"),
    ])

    expect(container.textContent).not.toContain("were reported on this page")
    expect(container.textContent).toContain("1 of the 6 visits that got here did something on this page")
  })

  it("does not say it on a page nobody used, which already has its own sentence", () => {
    const { container } = cardFor([
      tally("n_hero", 1, { views: 6, reached: 6 }),
      tally("n_foot", 1, { views: 6, reached: 2 }, "loom.footer"),
    ])

    expect(container.textContent).toContain("looking at this page rather than using it")
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

  /**
   * The row-per-part record, and it is the **second** table on the card now: the
   * section about what readers did keeps its own, so this looks the table up by
   * what it is for rather than by being the first one in a disclosure. A
   * selector that took the first `details table` was passing on the old card and
   * would have asserted the wrong table on this one.
   */
  it("keeps every part's own use one click down, beside the counters it belongs with", () => {
    const { container } = cardFor(BUSY)
    const table = [...container.querySelectorAll("details table")].find((candidate) =>
      candidate.textContent?.includes("used inside")
    )

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
