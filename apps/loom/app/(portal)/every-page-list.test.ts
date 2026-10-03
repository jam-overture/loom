import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { portalFile } from "@/app/(portal)/_lib/screen-source"

/**
 * Every list of pages in this portal, held against the two rules a list of pages
 * has to keep.
 *
 * ## Why this file exists rather than an assertion per screen
 *
 * The defect it guards was filed on 22 September with two screens in it, re-filed
 * on the 25th with a third, and a sweep of the lane while fixing it found **six**:
 * two nobody had counted, one of them arranging pages by the runtime's own
 * identifier through `localeCompare`. Every one of the six was correct on its own
 * and the set of them was the defect — which is exactly the shape a per-screen
 * guard cannot see, and the argument `_lib/screen-source.ts` already makes about
 * reading order: *the screen that ships a defect is by definition the one nobody
 * thought about.*
 *
 * So the lists are **found** rather than listed. A seventh list of pages is
 * inside these rules the moment somebody writes one, and there is no register to
 * forget to add it to.
 *
 * ## How a list of pages is recognised
 *
 * A file that keys a rendered element on a tree id renders one element per page:
 * `key={page.treeId}`, `key={listing.treeId}`, `key={check.treeId}`. React
 * requires the key, so this is not a convention a file can decline to follow, and
 * a tree id is what a list of pages is a list of.
 *
 * It is crude in one direction and that direction is safe: it can only ever find
 * *more* files than it should, and a file wrongly caught here fails loudly rather
 * than passing quietly. A detector that missed one would be the version of this
 * test that reports a clean lane for ever, which is why the count below is
 * pinned.
 */

const GROUP = portalFile()

const sourcesUnder = (directory: string): readonly { file: string; source: string }[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)

    if (entry.isDirectory()) return sourcesUnder(path)
    if (!entry.name.endsWith(".tsx") || entry.name.endsWith(".test.tsx")) return []

    return [{ file: path, source: readFileSync(path, "utf8") }]
  })

/** A rendered element keyed on a tree id — one element per listed page. */
const KEYED_ON_A_PAGE = /key=\{[A-Za-z]+\.treeId\}/u

const lists = sourcesUnder(GROUP)
  .filter((entry) => KEYED_ON_A_PAGE.test(entry.source))
  .map((entry) => ({
    where: entry.file.slice(GROUP.length + 1),
    source: entry.source,
  }))

/**
 * The lists that do not put an order sentence above themselves, each with the
 * argument for why — written at the point of use rather than kept as a second
 * list, which is the rule `runtimeWordsIn`'s `except` is written under: an
 * exemption a reviewer has to read is one a reviewer sees.
 */
const NAMES_NO_ORDER: Readonly<Record<string, string>> = {
  /*
   * Every row here needs the same thing from a reader, which is to go and look
   * at it. An order sentence names the *top* of a list, so a list with no top
   * would be claiming a priority it does not have — and on a failure notice, a
   * reader concluding that the second row matters less is the one wrong
   * conclusion available. It takes the shared tiebreak, which is the half that is
   * not optional.
   */
  "_components/unreadable-pages.tsx":
    "a list where every row needs the same thing has no top to name",
}

describe("every list of pages in this portal", () => {
  it("finds the lists that exist, so an empty sweep cannot pass as clean", () => {
    expect(lists.map((list) => list.where).sort()).toEqual([
      "_components/unreadable-pages.tsx",
      "portal/app/_components/app-composition.tsx",
      "portal/checkup/_components/checkup-choices.tsx",
      "portal/checkup/_components/sweep-rows.tsx",
      "portal/history/_components/tree-chooser.tsx",
      "portal/page.tsx",
      "portal/pages/page.tsx",
      "portal/readers/page.tsx",
      "portal/trust/_components/wrong-pages.tsx",
    ])
  })

  /**
   * The rule that removes the cursor order, and the whole reason the module
   * exists. A store lists trees in the order it can resume a read from — key
   * order in memory, index order in Postgres — which is a fact about the
   * implementation and not an arrangement anybody chose. A list that renders that
   * order has not decided anything, and two such lists disagree for no reason a
   * reader can find.
   *
   * `inWorstFirstOrder` counts: it is `inPageOrder` with the sweep's severity in
   * front of it, and it is the one rank that is not in `page-order.ts` because the
   * five standings it ranks are the sweep's own vocabulary.
   */
  it.each(lists.map((list) => [list.where, list.source]))(
    "%s decides its own order rather than rendering the store's",
    (where, source) => {
      expect(
        /inPageOrder|inWorstFirstOrder/u.test(source),
        `${where} renders a list of pages without going through _lib/page-order.ts`
      ).toBe(true)
    }
  )

  /**
   * The rule that makes the first one legible. Five orders across five screens is
   * the right answer — a list you act on, a list you pick from and a list of
   * results want different tops — and five *unstated* orders is the defect, because
   * a reader who opens two of them cannot tell whether the two screens agree.
   */
  it.each(
    lists
      .filter((list) => NAMES_NO_ORDER[list.where] === undefined)
      .map((list) => [list.where, list.source])
  )("%s says which order it is in", (where, source) => {
    expect(
      source.includes("<ListOrder"),
      `${where} lists pages without saying what order they are in`
    ).toBe(true)
  })

  /** A list that stops rendering `<ListOrder>` must earn its exemption, not inherit one. */
  it("exempts only the lists that have an argument for it", () => {
    expect(
      Object.keys(NAMES_NO_ORDER).filter((where) => !lists.some((list) => list.where === where))
    ).toEqual([])
  })

  /**
   * The assertion that stops this file quietly becoming decorative. A detector
   * that matched nothing would make both rules above vacuous and every `it.each`
   * above would report zero cases — which vitest treats as a pass.
   */
  it("recognises a list of pages by something React makes compulsory", () => {
    expect(lists.length).toBeGreaterThanOrEqual(9)
    expect(KEYED_ON_A_PAGE.test("<li key={listing.treeId}>")).toBe(true)
    expect(KEYED_ON_A_PAGE.test("<li key={change.proposalId}>")).toBe(false)
  })
})
