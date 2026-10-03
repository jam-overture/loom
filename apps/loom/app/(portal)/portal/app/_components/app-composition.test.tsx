import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { LoomTree, TreeId } from "@jam-overture/loom"
import type { DecorationLookup } from "@jam-overture/loom/react"

import { outlineRows } from "@/app/(portal)/_lib/outline"
import { pageNameOf } from "@/app/(portal)/_lib/page-name"
import { seedTree } from "@/app/(portal)/_lib/seed"

import { AppComposition, type CompositionPage } from "./app-composition"

/**
 * The app's own tree, and any part of it drawn on demand.
 *
 * The decoration lookup says every registered piece leaves a handle in the page,
 * which is this deployment's real answer and keeps the fixture about the
 * composition rather than about addressability — `proposed-view.test.ts` is where
 * the undecorated case is pinned.
 */
const everything: DecorationLookup = () => true

/**
 * Two pages built from the same seed, which is the fixture the per-page keying
 * needs: the trees are identical, so their node ids are too, and a selection
 * keyed on an id alone would light both rows at once.
 */
const pageOf = (treeId: string, tree: LoomTree = seedTree()): CompositionPage => ({
  treeId: treeId as TreeId,
  name: { ...pageNameOf(tree), treeId },
  tree,
  rows: outlineRows(tree, everything),
})

const composition = (pages: readonly CompositionPage[] = [pageOf("t_1")]) =>
  render(<AppComposition pages={pages} />)

const pieceButtons = (container: HTMLElement): readonly string[] =>
  [...container.querySelectorAll("button[aria-pressed]")].map(
    (button) => button.textContent ?? ""
  )

describe("AppComposition", () => {
  it("draws every page, and every piece inside it, as one tree", () => {
    const { container } = composition()
    const buttons = pieceButtons(container)

    expect(buttons.length).toBe(6)
    expect(buttons.some((label) => label.includes("loom.page"))).toBe(true)
    expect(buttons.some((label) => label.includes("loom.card"))).toBe(true)
  })

  /**
   * The words inside a part are in the tree and are not a piece — nothing
   * registered them, so there is nothing to draw on its own and nothing a button
   * could lead to. They are shown rather than dropped, because leaving them out
   * would make this tree a different shape from the page.
   */
  it("shows the words inside a part without offering them as a piece", () => {
    const { container } = composition()
    const words = seedTree().root.children[0]

    expect(words?.kind).toBe("element")
    expect(container.textContent).toContain("Loom")
    expect(pieceButtons(container).some((label) => label.includes("Loom —"))).toBe(false)
  })

  it("draws nothing until a piece is picked, and the piece once it is", () => {
    const { container } = composition()

    expect(screen.queryByRole("heading", { name: /piece you picked/u })).toBeNull()

    const first = container.querySelector("button[aria-pressed]")
    fireEvent.click(first!)

    expect(screen.getByRole("heading", { name: "The piece you picked" })).toBeTruthy()
  })

  it("draws several at once, and says how many", () => {
    const { container } = composition()
    const buttons = [...container.querySelectorAll("button[aria-pressed]")]

    fireEvent.click(buttons[1]!)
    fireEvent.click(buttons[3]!)

    expect(screen.getByRole("heading", { name: "The 2 pieces you picked" })).toBeTruthy()
  })

  it("lets a picked piece go when it is pressed again", () => {
    const { container } = composition()
    const first = container.querySelector("button[aria-pressed]")

    fireEvent.click(first!)
    expect(first?.getAttribute("aria-pressed")).toBe("true")

    fireEvent.click(first!)
    expect(first?.getAttribute("aria-pressed")).toBe("false")
    expect(screen.queryByRole("heading", { name: /piece you picked/u })).toBeNull()
  })

  /**
   * The defect this file exists to pin, and the one that would be invisible on
   * every deployment this portal has ever been photographed on: node ids are
   * minted per tree, so two pages can hold the same one. A selection keyed on the
   * id alone would light up a row on a page the reader never touched.
   */
  it("picks one page's piece without picking the identically numbered one on another", () => {
    const { container } = composition([pageOf("t_1"), pageOf("t_2")])
    const buttons = [...container.querySelectorAll("button[aria-pressed]")]

    expect(buttons.length).toBe(12)

    fireEvent.click(buttons[0]!)

    expect(buttons.filter((button) => button.getAttribute("aria-pressed") === "true")).toHaveLength(
      1
    )
    expect(screen.getByRole("heading", { name: "The piece you picked" })).toBeTruthy()
  })

  /**
   * A set of parts has no arrangement of its own (0199), so the one order that is
   * not invented is the one the pages are in. Asserted by clicking out of order
   * and reading the headings back in document order.
   */
  it("draws what was picked in page order rather than in the order it was clicked", () => {
    const { container } = composition()
    const buttons = [...container.querySelectorAll("button[aria-pressed]")]

    /** The card sits below the first heading on the page, and is clicked first. */
    fireEvent.click(buttons[3]!)
    fireEvent.click(buttons[1]!)

    const drawn =
      screen.getByRole("heading", { name: "The 2 pieces you picked" }).parentElement?.textContent ??
      ""

    expect(drawn.indexOf("loom.heading")).toBeGreaterThan(-1)
    expect(drawn.indexOf("loom.heading")).toBeLessThan(drawn.indexOf("loom.card"))
  })

  it("offers a way back to every page it lists", () => {
    const { container } = composition([pageOf("t_1"), pageOf("t_2")])
    const hrefs = [...container.querySelectorAll("a")].map((link) => link.getAttribute("href"))

    expect(hrefs).toContain("/portal/pages/t_1")
    expect(hrefs).toContain("/portal/pages/t_2")
  })

  /** A list of pages says what order it is in — the lane's rule, on a new list. */
  it("says what order its pages are in", () => {
    const { container } = composition([pageOf("t_1"), pageOf("t_2")])

    expect(container.textContent).toContain("by name")
  })

  it("lets the whole selection go at once, and only offers that when there is one", () => {
    const { container } = composition()

    expect(screen.queryByRole("button", { name: /Clear/u })).toBeNull()

    fireEvent.click(container.querySelector("button[aria-pressed]")!)
    fireEvent.click(screen.getByRole("button", { name: "Clear 1 picked" }))

    expect(screen.queryByRole("heading", { name: /piece you picked/u })).toBeNull()
  })
})
