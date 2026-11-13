import type { JsonObject, LoomTree } from "@jam-overture/loom"
import { describe, expect, it } from "vitest"

import { runsIn } from "./measure"
import { treeFor } from "./render"
import { PRODUCT_SURFACES, SITE_ROUTES, type SiteRoute } from "./site"

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
  /**
   * One row of a comparison, which is a row in the strongest sense this file
   * has: its cells are `<td>`s in a `<table>`, so their widths are the table's
   * columns and their heights are the row's. A cell that says two lines more
   * than the cell beside it is the hole this rule is about, drawn by the
   * browser's own table layout rather than by a grid.
   *
   * It arrived with `/why-use-it` on 26 October, which is the first page of
   * this site to use the band. The spread there is three words, against the
   * twelve this file allows.
   */
  "loom.comparison-row",
  /**
   * One row of a table, which is `loom.comparison-row` again and for the
   * identical reason: its cells really are `<td>`s in a `<table>`, so their
   * widths are the table's columns and their heights are the row's, and a cell
   * two lines taller than the one beside it draws the hole this rule is about.
   *
   * It arrived on 5 November with the band on `/why-use-it` that lists what
   * Loom changed. The widest spread there is two words against the twelve this
   * file allows, which is what a verb and a few words of the fictional
   * product's copy come to.
   */
  "loom.table-row",
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
  /**
   * A closed question is one line whatever its answer weighs, and how tall an
   * open one is belongs to the reader.
   *
   * **True of a list read downward and false of the same primitive in two
   * columns**, which is what this exemption did not say until 13 November and
   * what the front door's questions band cost. `columns: "two"` makes it a CSS
   * grid, five questions become five cells in three rows, and a grid row is as
   * tall as the tallest cell in it — so the question beside an open one is a
   * 51px question in a 172px box with its own rule 121px below the words it
   * belongs to. `ONLY_WHILE_ONE_COLUMN` below is the exemption's own condition,
   * stated where a test can read it.
   */
  "loom.faq-list": "rows open and close",
  /** A rail read downward. Each rung is the full width of the band, so no rung
   * is stretched to match another. */
  "loom.milestone-list": "read down, one rung per row",
  /**
   * The table itself, as against its rows. Its children are the rows, each the
   * full width of the table and each as tall as its own cells want, so nothing
   * here is stretched to match a sibling. The row is where the rule bites, and
   * it is in `ROWS` above.
   */
  "loom.table": "read down, one row at a time",
  /** None of these lays its children out in tracks of a common height: they
   * flow, wrap, or size to their own content. */
  "loom.nav": "flows and wraps",
  "loom.stack": "flows and wraps",
  "loom.footer": "flows and wraps",
  "loom.link-list": "flows and wraps",
  /** A card is a row's *cell*, not a row. Its own children are stacked. */
  "loom.card": "stacks its own children",
  /**
   * A list read downward, which is `loom.milestone-list` again and for the
   * identical reason: each row is the full width of the measure, each is as
   * tall as its own line needs, and nothing stretches one to match another.
   *
   * It arrived on 11 November with the band on `/why-use-it` that says the
   * package writes your first files. Evening its three lines up would be a
   * rule about prose rather than about cells, and a numbered list whose rows
   * had been written to one length would be the tell that somebody had applied
   * the wrong one.
   */
  "loom.list": "read down, one line per row",
  /**
   * A sentence with more than one pressable phrase in it, which arrived on
   * 16 October when `/how-it-works` gave its three clauses three destinations.
   *
   * The children are an inline run rather than cells: they are words in one
   * line of text, they wrap wherever the measure ends, and no phrase is
   * stretched to match another. Reading the three as a row to be evened up
   * would be asking three clauses of one sentence to be the same length, which
   * is a rule about prose and the opposite of the one this file holds.
   */
  "loom.prose": "an inline run of words, not cells",
  /**
   * A hero stacks what it is given: the heading region, then its content, down
   * a column. Two paragraphs in one are a lead and the line under it, which are
   * not two cells and are not meant to weigh the same.
   *
   * Unclassified until 26 October only because no hero on this site had two
   * children of one type before `/why-use-it`.
   */
  "loom.hero": "stacks its own children",
  /**
   * The table holds rows, and a row is the full width of the band. Nothing
   * stretches one row to the height of another, which is the same reason
   * `loom.milestone-list` is out: the run is read downward.
   */
  "loom.comparison-table": "read down, one criterion per row",
  /**
   * A screen and the marks over it, which are the two kinds of child this
   * takes and are not cells of anything. The screen is a slot; the marks are
   * placed at points on it by percentage, so no two of them share a track and
   * nothing is stretched to match anything.
   *
   * Arrived on 28 October with the example page on `/why-use-it`, which is the
   * first band on any surface of this application to use the frame at all. The
   * grid inside the screen is still a row and is still held: `allRows()` walks
   * the whole tree, so the three tiles on the example page are checked exactly
   * as the three on a band of this site are.
   */
  "loom.frame": "a screen and the marks over it, not cells",
}

/**
 * The exemptions that hold **only while the container is a single column**.
 *
 * Every entry in `NOT_ROWS` is a claim about a layout, and three of them say
 * the same thing in different words: *read down, one per row*. That claim is a
 * claim about the container's **props** and not about its type. A
 * `loom.faq-list` is read down; a `loom.faq-list` with `columns: "two"` is a
 * grid of cells stretched to a common height, which is this file's subject
 * exactly.
 *
 * So the site is held to not setting a second column on any of them. It is a
 * refusal rather than a measurement on purpose: the cells of these containers
 * **change height after the page has loaded**, and no word count taken at
 * render time can see a question that is about to open. There is no threshold
 * that would have caught the band this was written for.
 *
 * The way to have two columns of questions is two lists beside each other,
 * which is what the front door does now, and the grid holding them says
 * `align: "start"` so neither is stretched.
 *
 * **One of the five below can be given a second column today and the other
 * four cannot**, and they are all named anyway. `loom.faq-list` is the only one
 * whose props declare `columns`; the rest are `.strict()` schemas that would
 * refuse the key, so for those this is a claim nothing can currently break.
 * That is the point of writing it down. The exemption each of them has is *the
 * run is read downward*, and the day one of them grows a second column the
 * exemption stops being true, which is precisely what happened to the one that
 * already had the prop.
 */
const ONLY_WHILE_ONE_COLUMN: readonly string[] = [
  "loom.faq-list",
  "loom.milestone-list",
  "loom.list",
  "loom.comparison-table",
  "loom.table",
]

/** Whether a container's props put its children in more than one column. */
const laidOutInColumns = (props: JsonObject): boolean =>
  props["columns"] !== undefined && props["columns"] !== "one"

/**
 * Whether a run is a row for this file's purposes: cells across equal columns,
 * each stretched to the tallest.
 *
 * **The `align` half is the other thing a type cannot tell you.** A grid is a
 * row because it stretches, and a grid that says `align: "start"` does not:
 * every cell is as tall as its own content and nothing carries a difference.
 * So a `loom.grid` holding two lists of questions is correctly not a row, while
 * the same primitive holding four cards still is.
 */
const isRow = (run: { readonly container: string; readonly props: JsonObject }): boolean =>
  ROWS.includes(run.container) && run.props["align"] !== "start"

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
  readonly props: JsonObject
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
    props: run.props,
    cell: run.cell,
    words: run.words,
  }))

/**
 * **One page per route, as of 21 October.**
 *
 * This swept both deployments, because *"`/what-you-run` says a different
 * sentence on a deployment that is counting its readers from the one it says
 * on a deployment that is not."* It said that until 12 October, when the
 * maintainer had the tracking-status message taken off the site whether it is
 * counting or not, and both halves of this sweep have been the same tree since.
 *
 * The palettes are deliberately **not** swept, unlike `alignment.test.ts`. What
 * a theme can change is colour and type, and neither is a word; a loop over
 * three palettes here would triple the assertions and could not fail
 * differently in any of them, which is decoration rather than coverage — which
 * is, in the end, exactly what the deployment loop had become.
 */
const pageOf = (route: SiteRoute): LoomTree =>
  treeFor(route, { theme: "minimal" })

const allRows = (): readonly Row[] =>
  SITE_ROUTES.flatMap((route) => rowsOf(pageOf(route), route.path))

const describeRow = (row: Row): string =>
  `${row.route} — ${row.container} of ${row.words.length} ${row.cell} [${row.words.join(", ")}]`

describe("a row of cards says about the same amount in each card", () => {
  it.each(SITE_ROUTES.map((route) => [route.path, route] as const))(
    "%s: no card in a row is left holding the difference as empty space",
    (_path, route) => {
      for (const row of rowsOf(pageOf(route), route.path).filter(isRow)) {
        const spread = Math.max(...row.words) - Math.min(...row.words)

        expect(spread, describeRow(row)).toBeLessThanOrEqual(MOST_A_ROW_MAY_DIFFER)
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
    const measured = allRows().filter(isRow)
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
   * The exemptions are conditional, and this is the condition.
   *
   * **It is the case that would have caught the front door's questions band**,
   * which drew a 121px hole under a closed question from the day it was given a
   * second column until 13 November, with every assertion in this file green
   * the whole time. The band was a `loom.faq-list`, `loom.faq-list` is in
   * `NOT_ROWS`, and the reason written beside it — *rows open and close* — is
   * true of the primitive and false of the prop the band set.
   *
   * So this does not measure anything. A disclosure that opens is taller than
   * it was a moment ago and no reading taken at render time knows by how much,
   * so the only honest rule is that the site does not put one in a shared grid
   * row at all.
   */
  it("sets no second column on a container it exempts for being read downward", () => {
    const inColumns = allRows()
      .filter((row) => ONLY_WHILE_ONE_COLUMN.includes(row.container))
      .filter((row) => laidOutInColumns(row.props))
      .map(
        (row) =>
          `${row.route} — ${row.container} with columns: ${JSON.stringify(row.props["columns"])}`
      )

    expect(
      inColumns,
      `each of these is exempt from this file for being read down one row at a time, ` +
        `and a second column makes it a grid of cells stretched to a common height. ` +
        `Two of them side by side in a loom.grid with align: "start" is the way to two columns.`
    ).toEqual([])
  })

  /**
   * And the condition cannot quietly stop applying to anything.
   *
   * `ONLY_WHILE_ONE_COLUMN` names three containers. If none of them is on the
   * site any more, the case above passes by having nothing to look at — which
   * is the failure the *is measuring a row big enough* case above exists to
   * prevent for the measurement half, written again for the refusal half.
   */
  it("is watching a container that could have a second column set on it", () => {
    const watched = allRows().filter((row) => ONLY_WHILE_ONE_COLUMN.includes(row.container))

    expect(watched.length).toBeGreaterThan(0)
  })

  /**
   * The band the rule was written for, named, so a failure says which page went
   * wrong rather than only that some page did.
   */
  it("holds the front door's band of ways in, which is the one it was written for", () => {
    const waysIn = SITE_ROUTES.filter((route) => route.path === "/")
      .flatMap((route) => rowsOf(pageOf(route), route.path))
      .filter((row) => row.container === "loom.grid" && row.cell === "loom.card")
      /**
       * **Read off `PRODUCT_SURFACES` rather than typed, as of 31 October.**
       * It was `=== 4`, and 0328 took the demonstration out of that list, so
       * the filter matched nothing and the case passed its own `> 0` guard
       * only by failing it. A hand-written count of a list this site derives
       * is the thing that goes stale on somebody else's run.
       */
      .filter((row) => row.words.length === PRODUCT_SURFACES.length)

    expect(waysIn.length).toBeGreaterThan(0)

    for (const row of waysIn) {
      expect(Math.max(...row.words) - Math.min(...row.words), describeRow(row)).toBeLessThanOrEqual(
        MOST_A_ROW_MAY_DIFFER
      )
    }
  })
})
