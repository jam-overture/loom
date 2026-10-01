import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { NodeId } from "@jam-overture/loom"
import { LOOM_NODE_ATTRIBUTE } from "@jam-overture/loom/react"

import type { Mark } from "@/app/(portal)/_lib/proposed-view"

import { MarkedPage } from "./marked-page"

/**
 * The outlines over a drawn page.
 *
 * The children stand in for what a Server Component produced, and a plain div
 * carrying `data-loom-node` is a faithful stand-in for a rendered primitive —
 * 0010's whole point is that edit mode decorates rather than restructures, so the
 * attribute *is* what this component has to work with either way.
 */
const part = (nodeId: string, words: string) => (
  <div {...{ [LOOM_NODE_ATTRIBUTE]: nodeId }} data-words={words}>
    {words}
  </div>
)

const mark = (nodeId: string, kind: Mark["kind"]): Mark => ({ nodeId: nodeId as NodeId, kind })

const page = (marks: readonly Mark[]) =>
  render(
    <MarkedPage marks={marks}>
      {part("n_head", "Autumn arrivals")}
      {part("n_card", "Prices")}
    </MarkedPage>
  )

const marked = (container: HTMLElement): readonly string[] =>
  [...container.querySelectorAll("[data-loom-mark]")].map(
    (element) => `${element.getAttribute("data-words")}:${element.getAttribute("data-loom-mark")}`
  )

describe("MarkedPage", () => {
  it("outlines the part a change is about, and says which kind of change it is", () => {
    const { container } = page([mark("n_card", "going")])

    expect(marked(container)).toEqual(["Prices:going"])
  })

  it("outlines several parts at once, each with its own kind", () => {
    const { container } = page([mark("n_head", "changed"), mark("n_card", "going")])

    expect(marked(container)).toEqual(["Autumn arrivals:changed", "Prices:going"])
  })

  it("leaves a page with nothing to mark exactly as it was drawn", () => {
    const { container } = page([])

    expect(marked(container)).toEqual([])
    expect(container.textContent).toContain("Prices")
  })

  /**
   * The behavior the clear-then-set arrangement exists for, and the only one a
   * test written after the fact can see: a reviewer walking from one change to the
   * next stays on this route, so the component is re-rendered rather than
   * remounted. Setting without clearing would leave the previous change's part
   * outlined on a page it is not going to happen to.
   */
  it("takes a mark off a part the next change is not about", () => {
    const { container, rerender } = page([mark("n_card", "going")])

    rerender(
      <MarkedPage marks={[mark("n_head", "arriving")]}>
        {part("n_head", "Autumn arrivals")}
        {part("n_card", "Prices")}
      </MarkedPage>
    )

    expect(marked(container)).toEqual(["Autumn arrivals:arriving"])
  })

  /**
   * A mark that finds nothing is ordinary rather than exceptional: a part carrying
   * only words has no element of its own, and a primitive the conformance probe
   * could not judge (0012) may turn out not to decorate. It must cost the outline
   * and nothing else — above all not the picture.
   */
  it("draws the page as it was given when a mark matches nothing on it", () => {
    const { container } = page([mark("n_nowhere", "going"), mark("n_card", "changed")])

    expect(marked(container)).toEqual(["Prices:changed"])
    expect(container.textContent).toContain("Autumn arrivals")
  })

  /**
   * The class the CSS hangs off. Without it every outline in this file is a rule
   * that matches nothing, and every assertion above would go on passing — the
   * attribute is set by this component and the color is not.
   */
  it("puts the page in the box the outlines are declared against", () => {
    const { container } = page([mark("n_card", "going")])

    expect(container.querySelector(".loom-marked")).not.toBeNull()
  })
})
