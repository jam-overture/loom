import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ReviewQueue } from "./review-queue"

/**
 * 0019 calls `awaiting-confirmation` the portal's reason to exist, which makes
 * the *empty* queue the state this pane is in most of the time. It has to be
 * readable as a fact — "Loom decided, and none of it needed you" — rather than
 * as a pane that failed to load or a section that was never populated.
 */
describe("ReviewQueue", () => {
  it("tells a reader they are not behind on anything, rather than disappearing", () => {
    render(<ReviewQueue changes={[]} />)

    expect(screen.getByRole("heading", { name: "Waiting on you" })).toBeInstanceOf(HTMLElement)
    expect(document.body.textContent).toContain("Nothing is waiting for you.")
  })

  /**
   * The string this replaces was `Nothing is held.` — a sentence about the
   * runtime's hold store, addressed to somebody who knows there is one. The
   * assertion is kept as a negative because that is the sort of wording that
   * comes back one component at a time.
   */
  it("names the state without naming the mechanism that produced it", () => {
    render(<ReviewQueue changes={[]} />)

    expect(document.body.textContent).not.toContain("Nothing is held")
  })

  it("keeps the account of why an empty queue is not a stalled one, one click down", () => {
    render(<ReviewQueue changes={[]} />)

    expect(document.body.textContent).toContain("having decided, not having stalled")
    expect(document.querySelector("details")?.open).toBe(false)
  })

  it("shows an empty queue as empty, never as a failure", () => {
    const { container } = render(<ReviewQueue changes={[]} />)

    expect(container.querySelector("[data-tone]")?.getAttribute("data-tone")).toBe("empty")
    expect(screen.queryByRole("status")).toBeNull()
  })

  /**
   * A count is a thing to act on, so it appears when there is something to act
   * on and not otherwise. A `0` beside a heading that already says nothing is
   * waiting is the runtime's habit of reporting a number for its own sake.
   */
  it("puts no count beside the heading when there is nothing to count", () => {
    const { container } = render(<ReviewQueue changes={[]} />)

    expect(container.querySelector(".bg-awaiting")).toBeNull()
  })
})
