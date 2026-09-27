import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { NodeId } from "@jam-overture/loom"

import type { OutlineRow } from "@/app/(portal)/_lib/outline"

import { SelectionProvider } from "./selection-context"
import { TreeOutline } from "./tree-outline"

/**
 * The address book, headed `outline` over `3 nodes` — a data structure and its
 * cardinality, to somebody who has a page.
 *
 * The markers are the part that most needed a legend and never had one. They
 * are kept, because a symbol is faster to scan than a word once you know it,
 * and what they mean is now under the list rather than in nobody's head.
 */

const row = (
  nodeId: string,
  kind: OutlineRow["kind"],
  label: string,
  technical: string | null,
  addressing: OutlineRow["addressing"]
): OutlineRow => ({ nodeId, depth: 0, kind, label, technical, addressing })

const addressable = (nodeId: string): OutlineRow["addressing"] => ({
  outcome: "addressable",
  nodeId: nodeId as NodeId,
})

const delegated: OutlineRow["addressing"] = {
  outcome: "delegated",
  nodeId: "n_card" as NodeId,
  requested: "n_words" as NodeId,
  reason: "not-an-element",
}

const rows: readonly OutlineRow[] = [
  row("n_card", "element", "Card", "loom.card", addressable("n_card")),
  row("n_body", "slot", "Body space", "body", delegated),
  row("n_words", "text", "Hello there", null, delegated),
]

const outline = (given: readonly OutlineRow[] = rows) =>
  render(
    <SelectionProvider rows={given}>
      <TreeOutline />
    </SelectionProvider>
  )

describe("TreeOutline", () => {
  it("is headed with what a person has, not with what the runtime has", () => {
    outline()

    expect(screen.getByRole("heading", { name: "Parts of this page" })).toBeInstanceOf(HTMLElement)
    expect(document.body.textContent).not.toContain("nodes")
  })

  it("counts parts, in the singular when there is one", () => {
    outline([rows[0]!])

    expect(document.body.textContent).toContain("1 part")
  })

  it("counts parts in the plural when there is more than one", () => {
    outline()

    expect(document.body.textContent).toContain("3 parts")
  })

  /**
   * 0019: a row that cannot be pointed at in the DOM is still a row, because a
   * text node is a node the runtime can move and re-author. Hiding them would
   * be the wrong kind of honesty.
   */
  it("lists every part, including the ones a click cannot reach", () => {
    outline()

    expect(screen.getAllByRole("button")).toHaveLength(3)
  })

  it("marks the ones a click cannot reach rather than dropping them", () => {
    const { container } = outline()

    expect(container.textContent).toContain("↑")
  })

  /**
   * The marks were undocumented and the arrow was the worst of them: an
   * unexplained arrow on a row that will not respond reads as a broken row.
   */
  it("explains every mark, including the one that says a row cannot be clicked", () => {
    const { container } = outline()
    const legend = container.querySelector("details")

    expect(legend?.open).toBe(false)
    expect(legend?.textContent).toContain("A piece of the page")
    expect(legend?.textContent).toContain("A space inside a piece")
    expect(legend?.textContent).toContain("Words")
    expect(legend?.textContent).toContain("still works")
  })

  it("keeps the runtime's three words for them, one click down", () => {
    const { container } = outline()
    const legend = container.querySelector("details")

    for (const word of ["element", "slot", "text"]) {
      expect(legend?.textContent, word).toContain(word)
    }
  })

  /**
   * The marks carry no information a sighted reader cannot get from the
   * legend, and a screen reader announcing "black diamond suit" before every
   * row's name is noise. The row's own title carries the same fact in words.
   */
  it("hides the decorative marks from assistive technology", () => {
    const { container } = outline()

    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0)
  })

  /**
   * A tooltip is the one place a technical string cannot go behind a
   * disclosure, so it is the one place the plain sentence has to be the
   * surface. It used to read `this node renders without an element of its own,
   * so selection falls back to n_card`.
   */
  /**
   * The rail was the last thing on this screen speaking the runtime's
   * vocabulary: `loom.page` over `loom.heading` over `loom.card`, four inches
   * from a sentence about the same card in a person's words.
   */
  it("names every row in a person's words, and none of them by a registered type", () => {
    outline()

    const names = screen.getAllByRole("button").map((button) => button.textContent ?? "")

    expect(names.some((name) => name.includes("Card"))).toBe(true)
    expect(names.some((name) => name.includes("Body space"))).toBe(true)
    for (const name of names) expect(name).not.toContain("loom.")
  })

  /**
   * Nothing is deleted to make a screen simpler. The type each row used to
   * print is one pick away, in the pane under this list, and the legend is
   * where a reader who came for it is told so.
   */
  it("says where the type each row used to print has gone", () => {
    const { container } = outline()

    expect(container.querySelector("details")?.textContent).toContain("registered type")
  })

  it("says in a person's words what each row is and whether it can be clicked", () => {
    outline()

    const clickable = screen.getByRole("button", { name: /Card/ })
    const words = screen.getByRole("button", { name: /Hello there/ })

    expect(clickable.getAttribute("title")).toBe(
      "A piece of the page — you can click this on the page"
    )
    expect(words.getAttribute("title")).toBe("Words — clicking the page picks the part around it")
  })

  it("keeps the runtime's vocabulary out of every row's title", () => {
    outline()

    for (const button of screen.getAllByRole("button")) {
      expect(button.getAttribute("title"), button.textContent ?? "").not.toMatch(
        /\b(node|primitive|selection|ancestor|loom\.editable)\b/i
      )
    }
  })
})
