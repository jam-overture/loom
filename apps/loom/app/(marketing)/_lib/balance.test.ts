import type { LoomTree } from "@jam-overture/loom"
import { describe, expect, it } from "vitest"

import { runsIn } from "./measure"
import { treeFor } from "./render"
import { SITE_ROUTES, type SiteRoute } from "./site"

/**
 * How much each card in a row says, against how much the one beside it says.
 *
 * A row of cards is laid out across equal columns and every card in it is
 * stretched to the height of the tallest. That is the right behaviour and it
 * has one consequence nothing in this repository could report: **a card that
 * says less than its neighbour carries the difference as empty space**, and the
 * empty space is at the bottom, under the last line, where a reader reads it as
 * a card that is missing something.
 *
 * Photographed on a production build at 1280 on 30 September, on the front
 * door's *Keep going* band — the last content band a visitor meets and the one
 * whose whole job is to send them into the demonstration, the documentation,
 * the course and the portal:
 *
 * | card | says | body ends | footer starts | empty |
 * | --- | --- | --- | --- | --- |
 * | Try it yourself | 22 words | 247px | 413px | **166px** |
 * | Read the docs | 23 words | 247px | 413px | **166px** |
 * | Take the course | 23 words | 247px | 413px | **166px** |
 * | Open the portal | 21 + 27 words | 348px | 413px | 65px |
 *
 * Every card was 469px tall. The 65px on the fourth is the card's own bottom
 * padding and is what a full card looks like; the 166px on the other three is
 * **taller than the sentence above it**. One card said twice what its three
 * neighbours said, and three quarters of the band was the cost.
 *
 * Nothing was red and nothing could have been. Four cards, four valid trees,
 * every link resolving, no overflow, no diagnostic — the page is well-formed
 * whatever the sentences in it weigh. This is the same class this lane filed on
 * 29 September as *a prop with a safe default is invisible to every instrument
 * here except a camera*, one level out: not a prop nobody set, but a length
 * nobody compared. The remedy recorded there is the one this file is:
 * **when a camera finds it, the deliverable is the invariant rather than the
 * fix.**
 *
 * The second instance was found by running this file, a minute after it first
 * had a threshold in it — the *What to read next* band at the foot of every
 * page but the front door, where a card holding two words stood beside a card
 * holding twenty-five. `chrome.ts` has what changed and why.
 *
 * **It is stated over the tree rather than over the three pages this site has
 * today**, so a fourth page with a row of cards is checked the day it is added.
 */

/**
 * The word count and the run-finding are `measure.ts`'s, and were this file's
 * private helpers until the copy budget needed the same two. The reasoning that
 * used to sit here — why a string prop with a space in it counts as copy, and
 * why a slot is not a row — moved with them.
 */

/**
 * The containers whose children are laid out across equal columns and stretched
 * to a common height — which is the whole of what makes this rule apply.
 */
const ROWS: readonly string[] = [
  "loom.grid",
  "loom.feature-grid",
  "loom.stat-grid",
  "loom.milestone-row",
]

/**
 * The containers that hold several of one thing and are **not** a row of equal
 * cells, with the reason each is out. A list of exemptions is only honest if
 * every one of them has a reason that is about the layout rather than about the
 * failure being inconvenient.
 */
const NOT_ROWS: Readonly<Record<string, string>> = {
  /** Cells are deliberately unequal — `alternating` is wide, narrow, narrow,
   * wide — and the copy is written to the spans. `pages.test.ts` holds *that*
   * ratio, which is the opposite rule and the right one for this band. */
  "loom.mosaic": "cells are deliberately unequal widths",
  /** A closed question is one line whatever its answer weighs, and how tall an
   * open one is belongs to the reader. */
  "loom.faq-list": "rows open and close",
  /** A rail read downward. Each rung is the full width of the band, so no rung
   * is stretched to match another. */
  "loom.milestone-list": "read down, one rung per row",
  /** None of these lays its children out in tracks of a common height: they
   * flow, wrap, or size to their own content. */
  "loom.nav": "flows and wraps",
  "loom.stack": "flows and wraps",
  "loom.footer": "flows and wraps",
  "loom.link-list": "flows and wraps",
  /** A card is a row's *cell*, not a row. Its own children are stacked. */
  "loom.card": "stacks its own children",
}

/**
 * How far apart two cards in one row may be, in words.
 *
 * **A difference rather than a ratio, and that is the whole of why this rule
 * works.** The obvious statistic is *the wordiest card says no more than twice
 * the leanest*, and it is the wrong one twice over: a row of four-word cards at
 * three times has no empty space in it at all, and the defect this file was
 * written for measured **1.96** — it would have passed, on the band it was
 * photographed on. What makes a hole is lines, and lines are a difference.
 *
 * Twelve is two lines of the narrowest column this site lays out. Measured on
 * the production build above: a card in a four-column band at 1280 is 261px
 * wide and sets its body at about five and a half words to the line, rounded up
 * to six so the rule is never stricter than the measurement behind it. Two
 * lines is where a ragged bottom stops reading as rag and starts reading as a
 * hole.
 *
 * The margin either side is real rather than asserted: the widest spread this
 * site has today is **9** words, and the two defects this caught were **27**
 * and **22**.
 */
const WORDS_PER_LINE = 6
const LINES_OF_RAG_ALLOWED = 2
const MOST_A_ROW_MAY_DIFFER = WORDS_PER_LINE * LINES_OF_RAG_ALLOWED

type Row = {
  readonly route: string
  readonly container: string
  readonly cell: string
  readonly words: readonly number[]
}

/**
 * The runs on one page, tagged with the route they were found on so a failure
 * names the page. Which containers the rule *applies* to is this file's
 * question and is settled by `ROWS` below, not here.
 */
const rowsOf = (page: LoomTree, route: string): readonly Row[] =>
  runsIn(page.root).map((run) => ({
    route,
    container: run.container,
    cell: run.cell,
    words: run.words,
  }))

const ORIGIN = "https://loom.example"

/**
 * Both, because `/what-you-run` says a different sentence on a deployment that
 * is counting its readers from the one it says on a deployment that is not, and
 * a rule swept over only one of them is a rule about half the site.
 *
 * The palettes are deliberately **not** swept, unlike `alignment.test.ts`. What
 * a theme can change is colour and type, and neither is a word; a loop over
 * three palettes here would triple the assertions and could not fail
 * differently in any of them, which is decoration rather than coverage.
 */
const DEPLOYMENTS: readonly boolean[] = [false, true]

const pagesOf = (route: SiteRoute): readonly LoomTree[] =>
  DEPLOYMENTS.map((counting) => treeFor(route, { origin: ORIGIN, theme: "minimal", counting }))

const allRows = (): readonly Row[] =>
  SITE_ROUTES.flatMap((route) => pagesOf(route).flatMap((page) => rowsOf(page, route.path)))

const describeRow = (row: Row): string =>
  `${row.route} — ${row.container} of ${row.words.length} ${row.cell} [${row.words.join(", ")}]`

describe("a row of cards says about the same amount in each card", () => {
  it.each(SITE_ROUTES.map((route) => [route.path, route] as const))(
    "%s: no card in a row is left holding the difference as empty space",
    (_path, route) => {
      for (const page of pagesOf(route)) {
        for (const row of rowsOf(page, route.path).filter((found) =>
          ROWS.includes(found.container)
        )) {
          const spread = Math.max(...row.words) - Math.min(...row.words)

          expect(spread, describeRow(row)).toBeLessThanOrEqual(MOST_A_ROW_MAY_DIFFER)
        }
      }
    }
  )

  /**
   * The clause whose only job is that the sweep above cannot pass by having
   * nothing to look at.
   *
   * Deleting the *Keep going* band would turn every assertion in this file
   * green and silent, which is exactly the failure the 29 September entry says
   * to write against. So the site is held to still having a row of cards worth
   * measuring: at least three of them, saying enough between them that a
   * difference of two lines is a thing that could happen.
   */
  it("is measuring a row big enough for the rule to mean anything", () => {
    const measured = allRows().filter((row) => ROWS.includes(row.container))
    const substantial = measured.filter(
      (row) => row.words.length >= 3 && Math.max(...row.words) > MOST_A_ROW_MAY_DIFFER
    )

    expect(measured.length).toBeGreaterThan(0)
    expect(substantial.length).toBeGreaterThan(0)
  })

  /**
   * And the exemptions cannot go stale without saying so.
   *
   * `ROWS` is a list of primitive types, so the day a page is built out of a
   * grid primitive nobody here has used, this rule would quietly not apply to
   * it — the most expensive way for a check to be wrong, because the page looks
   * covered. Every container the site actually renders has to be on one of the
   * two lists, and a new one is red until somebody decides which.
   */
  it("has classified every container this site renders as a row or not a row", () => {
    const unclassified = [
      ...new Set(
        allRows()
          .filter((row) => !ROWS.includes(row.container) && NOT_ROWS[row.container] === undefined)
          .map((row) => row.container)
      ),
    ]

    expect(unclassified, `add each to ROWS or to NOT_ROWS with its reason`).toEqual([])
  })

  /**
   * The band the rule was written for, named, so a failure says which page went
   * wrong rather than only that some page did.
   */
  it("holds the front door's band of ways in, which is the one it was written for", () => {
    const waysIn = SITE_ROUTES.filter((route) => route.path === "/")
      .flatMap((route) => pagesOf(route).flatMap((page) => rowsOf(page, route.path)))
      .filter((row) => row.container === "loom.grid" && row.cell === "loom.card")
      .filter((row) => row.words.length === 4)

    expect(waysIn.length).toBeGreaterThan(0)

    for (const row of waysIn) {
      expect(Math.max(...row.words) - Math.min(...row.words), describeRow(row)).toBeLessThanOrEqual(
        MOST_A_ROW_MAY_DIFFER
      )
    }
  })
})
