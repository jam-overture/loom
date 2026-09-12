import { render } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { NodeId } from "@loom/runtime"
import { LOOM_NODE_ATTRIBUTE } from "@loom/runtime/react"

import type { Spotlight } from "@/app/(demo)/_lib/spotlight"

import { ChangeSpotlight } from "./change-spotlight"

/**
 * The mark, and the one thing about it that needs a browser.
 *
 * Drawing is a stylesheet and is tested where the rules are made. What is tested
 * here is the part a rule cannot do: three of the demo's five changes act below
 * the fold, so without this a visitor presses a button, the page changes exactly
 * as promised, and they watch nothing happen.
 */

/** Node ids are branded, and a fixture is the one place they are written by hand. */
const id = (value: string): NodeId => value as NodeId

const APPLIED: Spotlight = {
  nodeId: id("demo-n7"),
  tone: "applied",
  label: "Just changed",
  placement: "inside",
  subject: "node",
}
const AWAITING: Spotlight = {
  nodeId: id("demo-n7"),
  tone: "awaiting",
  label: "This would be removed",
  placement: "inside",
  subject: "node",
}

/**
 * jsdom implements neither of these, and both are decisions rather than
 * details: which scroller moves, and whether it animates.
 */
const browser = ({ wide, still = false }: { readonly wide: boolean; readonly still?: boolean }) => {
  const scrollIntoView = vi.fn()

  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("min-width") ? wide : still,
    media: query,
  }))

  const node = document.createElement("section")
  node.setAttribute(LOOM_NODE_ATTRIBUTE, APPLIED.nodeId)
  node.scrollIntoView = scrollIntoView
  document.body.append(node)

  return { scrollIntoView }
}

afterEach(() => {
  vi.unstubAllGlobals()
  /* The stage node is appended by hand, so Testing Library's cleanup does not
   * own it — and a leftover would be the node the next test's query finds. */
  document.body.replaceChildren()
})

describe("marking a change on the stage", () => {
  it("is nothing at all when there is nothing to mark", () => {
    const { container } = render(<ChangeSpotlight spots={[]} token="1:i_1" />)

    expect(container.querySelector("style")).toBeNull()
  })

  it("serves the rule for every marked node", () => {
    const { container } = render(
      <ChangeSpotlight spots={[APPLIED, { ...APPLIED, nodeId: id("demo-n9") }]} token="1:i_1" />
    )
    const rules = container.querySelector("style")?.textContent ?? ""

    expect(rules).toContain('[data-loom-node="demo-n7"]')
    expect(rules).toContain('[data-loom-node="demo-n9"]')
    expect(rules).toContain('content: "Just changed"')
  })

  it("brings the marked node into view", () => {
    const { scrollIntoView } = browser({ wide: true })

    render(<ChangeSpotlight spots={[APPLIED]} token="1:i_1" />)

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" })
  })

  it("does not animate the journey for a visitor who asked for less motion", () => {
    const { scrollIntoView } = browser({ wide: true, still: true })

    render(<ChangeSpotlight spots={[APPLIED]} token="1:i_1" />)

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "center" })
  })

  /**
   * The decision this component exists to get right. Stacked, the rail and the
   * stage are one document — so scrolling to a change the Gate is *holding*
   * would carry the visitor away from the two buttons it is waiting on.
   */
  it("leaves a stacked visitor with the buttons a held change is waiting on", () => {
    const { scrollIntoView } = browser({ wide: false })

    render(<ChangeSpotlight spots={[AWAITING]} token="0:i_1" />)

    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it("still carries a stacked visitor to a change that has landed", () => {
    const { scrollIntoView } = browser({ wide: false })

    render(<ChangeSpotlight spots={[APPLIED]} token="1:i_1" />)

    expect(scrollIntoView).toHaveBeenCalled()
  })

  /**
   * The hero on a phone. Centring a band taller than the screen shows its
   * middle, which is the one part of it that says nothing about the change.
   */
  it("goes to the top of a band too tall to centre", () => {
    const { scrollIntoView } = browser({ wide: false })
    const node = document.querySelector(`[${LOOM_NODE_ATTRIBUTE}]`)
    if (!(node instanceof HTMLElement)) throw new Error("no stage node")

    node.getBoundingClientRect = () => ({ height: window.innerHeight * 2 }) as DOMRect

    render(<ChangeSpotlight spots={[APPLIED]} token="1:i_1" />)

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" })
  })

  it("says nothing to a page that does not have the marked node", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }))

    expect(() => render(<ChangeSpotlight spots={[APPLIED]} token="1:i_1" />)).not.toThrow()
  })
})
