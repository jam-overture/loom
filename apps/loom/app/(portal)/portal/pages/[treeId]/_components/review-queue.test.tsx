import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { proposalIdSchema } from "@jam-overture/loom"

import { unreadableChange } from "@/app/(portal)/_lib/unreadable-change"

import { ReviewQueue } from "./review-queue"

/**
 * 0019 calls `awaiting-confirmation` the portal's reason to exist, which makes
 * the *empty* queue the state this pane is in most of the time. It has to be
 * readable as a fact — "Loom decided, and none of it needed you" — rather than
 * as a pane that failed to load or a section that was never populated.
 */
describe("ReviewQueue", () => {
  it("tells a reader they are not behind on anything, rather than disappearing", () => {
    render(<ReviewQueue changes={[]} unreadable={[]} />)

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
    render(<ReviewQueue changes={[]} unreadable={[]} />)

    expect(document.body.textContent).not.toContain("Nothing is held")
  })

  it("keeps the account of why an empty queue is not a stalled one, one click down", () => {
    render(<ReviewQueue changes={[]} unreadable={[]} />)

    expect(document.body.textContent).toContain("having decided, not having stalled")
    expect(document.querySelector("details")?.open).toBe(false)
  })

  /**
   * Not a failure, and — since this run — not an emptiness either.
   *
   * "Nothing is waiting for you" is Loom having judged every change on this page
   * and needed nothing from anybody. It rendered in the dashed box that means
   * *nothing here yet*, which is the one reading that makes a clean queue look
   * like an unfinished one, and the disclosure beneath it had grown a heading
   * explaining that away. A result gets the tone for a result.
   */
  it("shows an answered queue as settled — not as a failure, and not as an empty slot", () => {
    const { container } = render(<ReviewQueue changes={[]} unreadable={[]} />)

    expect(container.querySelector("[data-tone]")?.getAttribute("data-tone")).toBe("settled")
    expect(container.querySelector("[data-tone]")?.className).not.toContain("border-dashed")
    expect(screen.queryByRole("status")).toBeNull()
  })

  /**
   * A count is a thing to act on, so it appears when there is something to act
   * on and not otherwise. A `0` beside a heading that already says nothing is
   * waiting is the runtime's habit of reporting a number for its own sake.
   */
  it("puts no count beside the heading when there is nothing to count", () => {
    const { container } = render(<ReviewQueue changes={[]} unreadable={[]} />)

    expect(container.querySelector(".bg-awaiting")).toBeNull()
  })
})

/**
 * The half 0175 added and this screen dropped.
 *
 * A listing answers `{ held, unreadable }`, and the second half arrived with no
 * reader anywhere in the portal. On this screen the cost is the sharpest of the
 * three: a page whose only waiting change is one of these drew a green box
 * reading **"Nothing is waiting for you."** over a queue with something stuck
 * in it.
 */
describe("ReviewQueue, with a row nobody can read", () => {
  const stuck = (proposalId = "p_stuck", heldAt = "2026-07-30T12:00:00.000Z") =>
    unreadableChange("t_1", {
      proposalId: proposalIdSchema.parse(proposalId),
      heldAt,
      detail: "a stored hold did not parse: disposition",
    })

  it("does not claim a caught-up page when something is stuck on it", () => {
    render(<ReviewQueue changes={[]} unreadable={[stuck()]} />)

    expect(document.body.textContent).not.toContain("Nothing is waiting for you.")
    expect(document.body.textContent).toContain("Nothing is waiting that you can answer.")
    expect(screen.getByText("This change can’t be read.")).toBeInstanceOf(HTMLElement)
  })

  /**
   * The badge sits beside a heading reading "Waiting on you", and a row nobody
   * can read is not waiting on this reader. One number covering both would be a
   * claim the screen does not keep.
   */
  it("marks what can be answered apart from what cannot", () => {
    render(<ReviewQueue changes={[]} unreadable={[stuck(), stuck("p_b")]} />)

    /* The whole string, not its halves: `2can’t be read` contains both. */
    expect(document.body.textContent).toContain("2 can’t be read")
  })

  /** The sentence and the mark agree, and neither absorbs the other. */
  it("counts the answerable rows and says the shortfall separately", () => {
    render(<ReviewQueue changes={[]} unreadable={[stuck()]} />)

    expect(document.body.textContent).toContain(
      "1 change was found and couldn't be read; it's in the list below."
    )
  })

  /** Nothing about a stuck row appears on a page that has none. */
  it("adds neither mark nor sentence to a clean queue", () => {
    render(<ReviewQueue changes={[]} unreadable={[]} />)

    expect(document.body.textContent).not.toContain("can’t be read")
    expect(document.body.textContent).not.toContain("couldn't be read")
  })
})
