import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { entryPoints } from "@/app/(docs)/_lib/entry-points"

import { EntryPoints } from "./entry-points"

/**
 * The map of doors on `/docs/getting-started/installation`, rendered.
 *
 * It is the instance that matches this lane's 2 October finding exactly: a
 * produced block whose producer is tested hard and whose **printing** nothing
 * looked at. `entry-points.test.ts` holds the list against the package's own
 * `exports` map, in both directions, so a door that opens in `package.json` and
 * is missing from the list is a red test. None of that notices if the table
 * prints no rows — and this table is the first thing a reader is shown after
 * `npm install`, which makes a silently empty one an unusually bad page to have
 * no witness for.
 *
 * So this reads the words back out of the document. It deliberately holds the
 * row count against `entryPoints.length` *and* against being more than one:
 * every loop below walks the same list it is checking, and an empty list
 * satisfies all of them at once.
 */

const table = () => render(<EntryPoints />).container

const cellsOf = (container: HTMLElement): readonly string[][] =>
  [...container.querySelectorAll("tbody tr")].map((row) =>
    [...row.querySelectorAll("td")].map((cell) => cell.textContent ?? "")
  )

describe("the map of doors", () => {
  it("prints a row per published door", () => {
    expect(entryPoints.length).toBeGreaterThan(1)
    expect(cellsOf(table())).toHaveLength(entryPoints.length)
  })

  /**
   * In order, because the list is ordered deliberately — `@jam-overture/loom`
   * first and *"Start here"* beside it — and a table that printed the same
   * seventeen rows shuffled would pass a membership check.
   */
  it("prints each specifier, in the order the list gives them", () => {
    expect(cellsOf(table()).map(([specifier]) => specifier)).toEqual(
      entryPoints.map((entry) => entry.specifier)
    )
  })

  it("prints what is behind each door beside the door", () => {
    const rows = cellsOf(table())

    for (const [at, entry] of entryPoints.entries()) {
      expect(rows[at]?.[1], `"${entry.specifier}" has no summary on the page`).toBe(entry.summary)
    }
  })

  /**
   * The third column is the one a reader acts on first — whether an ordinary
   * application is expected to import this at all — and it is the only cell
   * that is not printed verbatim from the list.
   *
   * The three labels are written out here rather than imported from the
   * component. That is the same reasoning as `_lib/counts.test.ts`' spelled-out
   * list: a test that reads the table the component reads asserts that the
   * table equals itself, and `app` reading as a bare `app` on the page is
   * exactly the slip it would stop seeing.
   */
  it.each([
    ["app", "any app"],
    ["host", "hosts"],
    ["tooling", "tooling"],
  ])("says a %o door is for %o", (audience, label) => {
    const rows = cellsOf(table())
    const matching = [...entryPoints.entries()].filter(([, entry]) => entry.audience === audience)

    expect(matching.length).toBeGreaterThan(0)

    for (const [at, entry] of matching) {
      expect(rows[at]?.[2], `"${entry.specifier}" is labelled wrongly`).toBe(label)
    }
  })

  it("gives the three columns their headings", () => {
    const headings = [...table().querySelectorAll("thead th")].map((cell) => cell.textContent)

    expect(headings).toEqual(["Import", "What is behind it", "For"])
  })

  /**
   * The one claim here that is about layout rather than content, and it is in
   * because of what the rest of this branch is about. A specifier is unbreakable
   * to a line-breaker, so the cell holding it is `whitespace-nowrap` and the
   * table scrolls **inside its own box**; without that box the widest door
   * would push the page sideways on a phone, which is the defect this table's
   * neighbour page had for eleven days.
   */
  it("keeps the specifier on one line, in a box that can scroll on its own", () => {
    const container = table()
    const cell = container.querySelector("tbody td")
    const box = container.querySelector("[data-doors]")

    expect(cell?.className).toContain("whitespace-nowrap")
    expect(box?.className).toContain("overflow-x-auto")
  })

  /**
   * And that the box can be named, which is not decoration. The page this
   * table is on has a second table underneath it, so `table` resolves to two
   * elements — a screenshot harness refuses that outright, and a test that used
   * it would quietly be asserting about whichever one came first.
   */
  it("is nameable on a page that has another table", () => {
    expect(table().querySelectorAll("[data-doors]")).toHaveLength(1)
  })
})
