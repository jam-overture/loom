import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ReviewQueue } from "./review-queue"

/**
 * 0019 calls `awaiting-confirmation` the portal's reason to exist, which makes
 * the *empty* queue the state this pane is in most of the time. It has to be
 * readable as a fact — "the Gate decided, and none of it needed you" — rather
 * than as a pane that failed to load or a section that was never populated.
 */
describe("ReviewQueue", () => {
  it("says nothing is held rather than disappearing", () => {
    render(<ReviewQueue held={[]} />)

    expect(screen.getByRole("heading", { name: "waiting on you" })).toBeInstanceOf(HTMLElement)
    expect(document.body.textContent).toContain("Nothing is held.")
  })

  it("explains the middle case, so an empty queue is not read as a stalled one", () => {
    render(<ReviewQueue held={[]} />)

    expect(document.body.textContent).toContain("having decided, not having stalled")
  })

  it("shows an empty queue as empty, never as a failure", () => {
    const { container } = render(<ReviewQueue held={[]} />)

    expect(container.querySelector("[data-tone]")?.getAttribute("data-tone")).toBe("empty")
    expect(screen.queryByRole("status")).toBeNull()
  })

  it("counts what is held beside the heading, whether or not there is any", () => {
    const { container } = render(<ReviewQueue held={[]} />)

    expect(container.querySelector(".font-mono")?.textContent).toBe("0")
  })
})
