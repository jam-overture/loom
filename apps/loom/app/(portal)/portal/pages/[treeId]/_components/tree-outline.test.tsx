import { fireEvent, render, screen } from "@testing-library/react"
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
): OutlineRow => ({
  nodeId: nodeId as NodeId,
  parentId: null,
  depth: 0,
  kind,
  label,
  technical,
  addressing,
})

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
   * Rows toggle, so a reader can end up with more picked than they meant. The
   * count is what tells them, in the place the total already was — and it is a
   * count rather than a line of instructions, because clicking a second row and
   * having it join the first is a thing a person discovers by doing it.
   */
  it("says how many are picked, once any are", () => {
    outline()

    fireEvent.click(screen.getByRole("button", { name: /Card/ }))

    expect(document.body.textContent).toContain("1 of 3 picked")

    fireEvent.click(screen.getByRole("button", { name: /Hello there/ }))

    expect(document.body.textContent).toContain("2 of 3 picked")
  })

  it("picks a second part rather than replacing the first", () => {
    outline()

    fireEvent.click(screen.getByRole("button", { name: /Card/ }))
    fireEvent.click(screen.getByRole("button", { name: /Hello there/ }))

    expect(screen.getByRole("button", { name: /Card/ }).getAttribute("aria-pressed")).toBe("true")
    expect(screen.getByRole("button", { name: /Hello there/ }).getAttribute("aria-pressed")).toBe(
      "true"
    )
  })

  /**
   * The one behaviour a toggling selection needs no instructions for, and the
   * reason there is no modifier key anywhere on this screen.
   */
  it("lets a part go when it is picked a second time", () => {
    outline()

    fireEvent.click(screen.getByRole("button", { name: /Card/ }))
    fireEvent.click(screen.getByRole("button", { name: /Card/ }))

    expect(screen.getByRole("button", { name: /Card/ }).getAttribute("aria-pressed")).toBe("false")
    expect(document.body.textContent).toContain("3 parts")
  })

  /**
   * `aria-pressed` and not `aria-selected`: a row is a toggle a reader turns on
   * independently of every other row. With the wrong one, picking a second part
   * is announced as the first one being dropped.
   */
  it("announces every row as a toggle rather than as one of a single choice", () => {
    outline()

    for (const button of screen.getAllByRole("button")) {
      expect(button.getAttribute("aria-selected")).toBeNull()
      expect(button.getAttribute("aria-pressed")).toBe("false")
    }
  })

  it("offers a way to let all of them go, and only once some are picked", () => {
    outline()

    expect(screen.queryByRole("button", { name: /Let go of/ })).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: /Card/ }))
    fireEvent.click(screen.getByRole("button", { name: /Hello there/ }))
    fireEvent.click(screen.getByRole("button", { name: "Let go of all of them" }))

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

  /** Every row, and nothing else, before anything has been picked. */
  it("adds no controls to the list until there is something to let go of", () => {
    outline()

    fireEvent.click(screen.getByRole("button", { name: /Card/ }))

    expect(screen.getAllByRole("button")).toHaveLength(4)
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

  /**
   * What a reader does not discover by clicking: that several picks are drawn
   * together, and in the order the page holds them rather than the order they
   * were clicked.
   */
  it("says what picking more than one is for", () => {
    const { container } = outline()

    expect(container.querySelector("details")?.textContent).toContain("Pick more than one")
    expect(container.querySelector("details")?.textContent).toContain("order the page")
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

/**
 * The folding and the search, on the component rather than on the reading.
 *
 * `_lib/outline-view.test.ts` holds which rows a state draws. What is left here
 * is what a reader can actually do with that: type in a box, press an arrow,
 * and get the whole page back. Every assertion is also the *nothing is removed*
 * rule read as a sequence — a row that is folded away is reached by pressing
 * one thing, and a search that found nothing is undone by pressing one thing.
 */

/**
 * A page long enough to arrive folded: a root, a space, and eleven cards each
 * holding its own words. Twenty-four rows, against a budget of twenty — so the
 * list opens the page and the space, draws the eleven cards, and holds their
 * words back. Which pages arrive folded and how far is
 * `_lib/outline-view.test.ts`'s question; this file's is what a reader can do
 * about it.
 *
 * Ten of the cards are called `Card`, which is what a real page looks like and
 * is the reason a search is worth having at all. The eleventh is an `Offer`
 * holding *Buy now*, and it is the row every test below reaches for: it sits at
 * depth 3 behind one chevron, it is the thing a reader actually wants to point
 * at, and it is nameable without matching the other ten.
 */
const CARDS = 11

const nested: readonly OutlineRow[] = [
  { ...row("n_page", "element", "Page", "loom.page", addressable("n_page")), depth: 0 },
  {
    ...row("n_body", "slot", "Body space", "body", addressable("n_body")),
    parentId: "n_page" as NodeId,
    depth: 1,
  },
  ...Array.from({ length: CARDS }, (_unused, index) => {
    const last = index === CARDS - 1

    return [
      {
        ...row(
          `n_card${index}`,
          "element",
          last ? "Offer" : "Card",
          last ? "loom.offer" : "loom.card",
          addressable(`n_card${index}`)
        ),
        parentId: "n_body" as NodeId,
        depth: 2,
      },
      {
        ...row(
          `n_words${index}`,
          "text",
          last ? "Buy now" : `Words ${index}`,
          null,
          addressable(`n_words${index}`)
        ),
        parentId: `n_card${index}` as NodeId,
        depth: 3,
      },
    ]
  }).flat(),
]

const inside = (label: string) =>
  screen.getByRole("button", { name: `Show what is inside ${label}` })

/**
 * The row itself, by its exact name.
 *
 * `/Card/` matches the fold control beside it too, which is the one cost of
 * naming that control after the part it opens — and the name is worth the cost,
 * because twenty bare *Show* buttons is what a screen reader reads out
 * otherwise. The marks and the count on a row are `aria-hidden`, so a row's
 * accessible name is the part's name and nothing else.
 */
const part = (label: string) => screen.getByRole("button", { name: label })

describe("TreeOutline, folded", () => {
  it("arrives with the deepest parts folded away, and says how many are drawn", () => {
    outline(nested)

    expect(screen.queryByRole("button", { name: /Buy now/ })).toBeNull()
    expect(document.body.textContent).toContain("Showing 13 of 24 parts")
  })

  /** The number on a folded row is what makes it a disclosure and not a filter. */
  it("says how many parts a folded row is holding, without opening it", () => {
    const { container } = outline(nested)
    const rowsDrawn = [...container.querySelectorAll('[data-outline="list"] li')]
    const card = rowsDrawn.find((one) => one.textContent?.includes("Offer"))

    expect(card?.textContent).toContain("1")
    expect(inside("Offer").getAttribute("aria-expanded")).toBe("false")
  })

  it("opens a folded row when its arrow is pressed, and closes it again", () => {
    outline(nested)

    fireEvent.click(inside("Offer"))

    expect(screen.getByRole("button", { name: /Buy now/ })).toBeInstanceOf(HTMLElement)

    fireEvent.click(screen.getByRole("button", { name: "Hide what is inside Offer" }))

    expect(screen.queryByRole("button", { name: /Buy now/ })).toBeNull()
  })

  /**
   * Opening a part must not pick it. A reader looking inside a card has not
   * asked for a change to the card, and one control doing both is the thing
   * that would make this list unusable for the screen it is on.
   */
  it("does not pick a row when its arrow is pressed", () => {
    outline(nested)

    fireEvent.click(inside("Offer"))

    expect(part("Offer").getAttribute("aria-pressed")).toBe("false")
    expect(document.body.textContent).toContain("24 parts")
  })

  it("offers no arrow on a part with nothing inside it", () => {
    outline(nested)

    fireEvent.click(inside("Offer"))

    expect(screen.queryByRole("button", { name: /inside Buy now/ })).toBeNull()
  })

  it("says nothing about folding on a page small enough to show whole", () => {
    outline()

    expect(document.body.textContent).not.toContain("Showing")
  })
})

describe("TreeOutline, searched", () => {
  const find = () => screen.getByRole("searchbox", { name: "Find a part of this page" })

  it("finds a part folded three levels down, without anything being opened", () => {
    outline(nested)

    fireEvent.change(find(), { target: { value: "buy" } })

    expect(screen.getByRole("button", { name: /Buy now/ })).toBeInstanceOf(HTMLElement)
    expect(document.body.textContent).toContain("1 part matches")
  })

  /** A match is shown with what holds it, because a match on its own locates nothing. */
  it("shows everything a match is inside along with it", () => {
    outline(nested)

    fireEvent.change(find(), { target: { value: "buy" } })

    for (const label of ["Page", "Body space", "Offer"]) {
      expect(part(label), label).toBeInstanceOf(HTMLElement)
    }
  })

  it("answers to the registry's own word as well as to the person's", () => {
    outline(nested)

    fireEvent.change(find(), { target: { value: "loom.offer" } })

    expect(document.body.textContent).toContain("1 part matches")
    expect(part("Offer")).toBeInstanceOf(HTMLElement)
  })

  it("says plainly that nothing is called that, rather than showing an empty box", () => {
    outline(nested)

    fireEvent.change(find(), { target: { value: "trombone" } })

    expect(document.body.textContent).toContain("No part of this page is called")
    expect(document.body.textContent).toContain("trombone")
  })

  /** The way back is a control, not a gesture. */
  it("puts the whole page back when asked, from a search that found nothing", () => {
    outline(nested)

    fireEvent.change(find(), { target: { value: "trombone" } })
    fireEvent.click(screen.getByRole("button", { name: "Show the whole page again" }))

    expect((find() as HTMLInputElement).value).toBe("")
    expect(part("Offer")).toBeInstanceOf(HTMLElement)
    expect(document.body.textContent).toContain("Showing 13 of 24 parts")
  })

  it("keeps the page's own count in the heading while a search is narrowing the list", () => {
    outline(nested)

    fireEvent.change(find(), { target: { value: "buy" } })

    expect(document.body.textContent).toContain("24 parts")
  })

  it("offers no arrows while a search is running, because the search decides the list", () => {
    outline(nested)

    fireEvent.change(find(), { target: { value: "card" } })

    expect(screen.queryAllByRole("button", { name: /what is inside/ })).toEqual([])
  })

  /**
   * A part picked by clicking the page itself is deeper than the list arrives
   * open to on any real page, so without this the list marks a row that is not
   * on the screen.
   */
  it("unfolds everything holding a part that was picked while searching", () => {
    outline(nested)

    fireEvent.change(find(), { target: { value: "buy" } })
    fireEvent.click(screen.getByRole("button", { name: /Buy now/ }))
    fireEvent.click(screen.getByRole("button", { name: "Show the whole page again" }))

    expect(screen.getByRole("button", { name: /Buy now/ }).getAttribute("aria-pressed")).toBe(
      "true"
    )
  })
})

describe("the box the list sits in", () => {
  /**
   * The audit's second finding, as a property: the pane that says what you
   * picked has to be on the same screen as the row you picked it with, and a
   * list that can be any height at all is the one arrangement where that cannot
   * be guaranteed. 189 open rows made that list 4,594px tall and put
   * `Nothing picked yet` at y 5,298.
   */
  it("is bounded and scrolls inside itself on a page long enough to fold", () => {
    const { container } = outline(nested)
    const list = container.querySelector('[data-outline="list"]')

    expect(list?.className).toContain("overflow-y-auto")
    expect(list?.className).toContain("h-[24rem]")
  })

  /**
   * A reserved height and not a maximum. A `max-h` lets the box collapse, so a
   * reader typing into the search box watches everything under the list move on
   * every keystroke — measured at 346px folded, 384px on a search that matched
   * and 10px on one that did not.
   */
  it("holds its height through a search that matched and one that did not", () => {
    const { container } = outline(nested)
    const height = () => container.querySelector('[data-outline="list"]')?.className
    const before = height()

    fireEvent.change(screen.getByRole("searchbox", { name: "Find a part of this page" }), {
      target: { value: "offer" },
    })
    expect(height()).toBe(before)

    fireEvent.change(screen.getByRole("searchbox", { name: "Find a part of this page" }), {
      target: { value: "trombone" },
    })
    expect(height()).toBe(before)
  })

  /**
   * Nothing to fold means nothing moves, and a 384px box around three rows
   * would be padding a list out to look like a problem it does not have.
   */
  it("reserves no height on a page short enough to arrive whole", () => {
    const { container } = outline()

    expect(container.querySelector('[data-outline="list"]')?.className).not.toContain("h-[24rem]")
  })
})
