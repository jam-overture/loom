import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { buildElement, buildText, createTree, sequentialIdFactory } from "@jam-overture/loom"

import { portalDecoration } from "@/app/(portal)/_lib/addressing"
import { outlineRows } from "@/app/(portal)/_lib/outline"

import { PickedParts } from "./picked-parts"
import { SelectionProvider } from "./selection-context"
import { TreeOutline } from "./tree-outline"

/**
 * `renderLoomExcerpt` had been published for weeks and the portal had never
 * called it. This is the pane that does, and the property worth testing is not
 * that React rendered something — it is that **the picture is of the part, and
 * of nothing else**.
 *
 * A page whose two cards say different things is the shape that proves it: a
 * pane that quietly drew the whole page, or the wrong subtree, passes any test
 * that only asks whether markup appeared.
 */
const ids = sequentialIdFactory("p")

const card = (words: string) =>
  buildElement(ids, {
    type: "loom.card",
    children: [
      buildElement(ids, { type: "loom.heading", children: [buildText(ids, words)] }),
    ],
  })

const tree = createTree(
  buildElement(ids, { type: "loom.page", children: [card("Autumn"), card("Winter")] }),
  ids
)

const rows = outlineRows(tree, portalDecoration)

const pane = () =>
  render(
    <SelectionProvider rows={rows}>
      <TreeOutline />
      <PickedParts tree={tree} />
    </SelectionProvider>
  )

/**
 * The outline lists both cards as `Card`, so a pick has to go by the words
 * underneath. `getAllByRole` then `[0]` rather than `getByRole`, because the
 * heading row and the text row under it both match the words.
 */
const pick = (name: RegExp) => fireEvent.click(screen.getAllByRole("button", { name })[0]!)

/** The pane, told apart from the outline rendered beside it. */
const drawn = (container: HTMLElement): HTMLElement | null =>
  container.querySelector("section")

describe("PickedParts", () => {
  /**
   * Nothing picked is not an empty state here. The rail already says "Nothing
   * picked yet" and says what picking is for; a second empty box under the page
   * would be the same sentence twice, pushing the one obvious action down the
   * screen.
   */
  it("takes no room at all until something is picked", () => {
    const { container } = pane()

    expect(drawn(container)).toBeNull()
  })

  it("draws the part that was picked", () => {
    const { container } = pane()

    pick(/Autumn/)

    expect(drawn(container)?.textContent).toContain("Autumn")
  })

  /**
   * The property the pane exists for. An excerpt of one card must not carry the
   * other card's words — which is what would happen if this drew the tree from
   * the root and hid the rest, or resolved the wrong subtree.
   */
  it("draws only that part, and not the rest of the page", () => {
    const { container } = pane()

    pick(/Autumn/)

    expect(drawn(container)?.textContent).not.toContain("Winter")
  })

  it("draws several, in the order the page holds them", () => {
    const { container } = pane()

    pick(/Winter/)
    pick(/Autumn/)

    const text = drawn(container)?.textContent ?? ""

    expect(text.indexOf("Autumn")).toBeGreaterThan(-1)
    expect(text.indexOf("Autumn")).toBeLessThan(text.indexOf("Winter"))
  })

  it("heads itself with how many were picked, in a person's words", () => {
    const { container } = pane()

    pick(/Autumn/)

    expect(screen.getByRole("heading", { name: "The part you picked" })).toBeInstanceOf(HTMLElement)

    pick(/Winter/)

    expect(drawn(container)?.textContent).toContain("The 2 parts you picked")
  })

  it("names each part above its picture, with its id after the name", () => {
    const { container } = pane()

    pick(/Autumn/)

    const autumn = rows.find((row) => row.label === "Autumn")

    expect(autumn?.nodeId).toBeTypeOf("string")
    expect(drawn(container)?.textContent).toContain(autumn?.nodeId)
  })

  it("lets a reader put one back without going to the list", () => {
    const { container } = pane()

    pick(/Autumn/)
    pick(/Winter/)
    fireEvent.click(screen.getByRole("button", { name: /^Let go of Autumn$/ }))

    expect(drawn(container)?.textContent).toContain("The part you picked")
  })

  it("lets all of them go at once", () => {
    const { container } = pane()

    pick(/Autumn/)
    pick(/Winter/)
    fireEvent.click(screen.getByRole("button", { name: "Let them go" }))

    expect(drawn(container)).toBeNull()
  })

  /**
   * A part picked while a change lands underneath the reader. The seam answers
   * `found: false` rather than making this scan diagnostics for it, and the
   * sentence says the two things a person needs: nothing is broken, and here is
   * what to do.
   */
  it("says a part is gone rather than drawing an empty box", () => {
    const { container } = render(
      <SelectionProvider rows={rows}>
        <TreeOutline />
        <PickedParts tree={createTree(buildElement(ids, { type: "loom.page" }), ids)} />
      </SelectionProvider>
    )

    pick(/Autumn/)

    expect(drawn(container)?.textContent).toContain("isn't on the page any more")
    expect(drawn(container)?.textContent).toContain("Nothing is broken")
  })

  /**
   * Nothing is removed. The renderer's own account of what it could not draw is
   * the one thing here written for whoever deployed this rather than for whoever
   * opened it, so it goes one click down — and this is the only screen in the
   * portal where it can be read for one part rather than for a whole page.
   */
  it("keeps the runtime's account of what it could not draw, one click down", () => {
    const unknown = sequentialIdFactory("u")
    const strange = createTree(
      buildElement(unknown, {
        type: "loom.page",
        children: [buildElement(unknown, { type: "acme.nowhere" })],
      }),
      unknown
    )
    const strangeRows = outlineRows(strange, portalDecoration)

    const { container } = render(
      <SelectionProvider rows={strangeRows}>
        <TreeOutline />
        <PickedParts tree={strange} />
      </SelectionProvider>
    )

    fireEvent.click(screen.getAllByRole("button", { name: /Nowhere/ })[0]!)

    const details = drawn(container)?.querySelector("details")

    expect(details?.open).toBe(false)
    expect(details?.textContent).toContain("acme.nowhere")
  })

  it("says nothing about a part that drew cleanly", () => {
    const { container } = pane()

    pick(/Autumn/)

    expect(drawn(container)?.querySelector("details")).toBeNull()
  })
})
