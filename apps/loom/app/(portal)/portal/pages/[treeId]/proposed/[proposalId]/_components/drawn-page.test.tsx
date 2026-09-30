import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { NodeId } from "@jam-overture/loom"
import { LOOM_NODE_ATTRIBUTE } from "@jam-overture/loom/react"

import { DrawnPage } from "./drawn-page"

const drawn = () =>
  render(
    <DrawnPage
      title="Your page now"
      note="Exactly what your readers are being served at this moment."
      marks={[{ nodeId: "n_card" as NodeId, kind: "going" }]}
    >
      <div {...{ [LOOM_NODE_ATTRIBUTE]: "n_card" }}>Prices</div>
    </DrawnPage>
  )

describe("DrawnPage", () => {
  it("says which of the two pictures this is, above it", () => {
    const { container } = drawn()
    const heading = screen.getByRole("heading", { name: "Your page now" })
    const picture = container.querySelector(".loom-marked")

    expect(heading).toBeTruthy()
    expect(picture).not.toBeNull()
    expect(heading.compareDocumentPosition(picture!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("draws the page it was handed, with the change's parts outlined on it", () => {
    const { container } = drawn()

    expect(container.querySelector('[data-loom-mark="going"]')?.textContent).toBe("Prices")
  })

  /**
   * A page wider than the pane is a fact about the page, and this screen is where
   * somebody decides whether to accept a change that may have made it so. Clipping
   * would hide the evidence; scrolling shows it and says so by being scrollable.
   */
  it("lets a page wider than the pane be scrolled to rather than clipped", () => {
    const { container } = drawn()
    const frame = container.querySelector(".overflow-x-auto")

    expect(frame).not.toBeNull()
    expect(frame?.className).not.toContain("overflow-hidden")
  })
})
