import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { proposalIdSchema } from "@loom/runtime"

import { UNTITLED, type PageName } from "@/app/(portal)/_lib/page-name"
import { unreadableChange } from "@/app/(portal)/_lib/unreadable-change"
import { runtimeWordsIn } from "@/app/(portal)/_test/plain-language"

import { UnreadableChangeCard } from "./unreadable-change-card"

/**
 * The row that used to not exist.
 *
 * 0175 gave a listing a second half — the rows it could place and could not
 * read — and every screen that read the listing took `.held` and dropped it. So
 * what these pin is not a rewording: it is that a change stuck in somebody's
 * queue is on their screen at all, in its place in time, with the account of
 * what went wrong one click down and no buttons pretending it can be answered.
 */

const change = unreadableChange("t_1", {
  proposalId: proposalIdSchema.parse("p_3f2a"),
  heldAt: "2026-07-30T12:00:00.000Z",
  detail: "a stored hold did not parse: disposition",
})

const page: PageName = { name: "Autumn arrivals", treeId: "t_1", derived: true }

const openDisclosures = (container: HTMLElement): void => {
  for (const details of container.querySelectorAll("details")) details.open = true
}

describe("a change nobody can answer", () => {
  it("says what it is before anything else", () => {
    render(<UnreadableChangeCard change={change} page={page} />)

    expect(screen.getByText("This change can’t be read.")).toBeTruthy()
  })

  /**
   * The only human-facing fact the row carries, and the reason it is a card in
   * the queue rather than a count at the top of it: a reader sees at a glance
   * whether this turned up an hour ago or has been sitting above four
   * answerable changes since July.
   */
  it("says how long it has been stuck, in the queue's own shape", () => {
    const { container } = render(<UnreadableChangeCard change={change} page={page} />)
    const when = container.querySelector("time")

    expect(when?.textContent).toBe("waiting since 30 July 2026 at 12:00 UTC")
    expect(when?.getAttribute("dateTime")).toBe("2026-07-30T12:00:00.000Z")
  })

  /**
   * On the front door this row is one of several drawn from several pages, so
   * which page it is on is what tells it from the card above it. Identity is
   * both halves by the 22 August rule — the words and the id.
   */
  it("names the page it is on when it is drawn among several", () => {
    const { container } = render(<UnreadableChangeCard change={change} page={page} />)

    expect(screen.getByText("Autumn arrivals")).toBeTruthy()
    expect(container.textContent).toContain("t_1")
  })

  /**
   * On the page screen the page is the screen, and a name repeated on every row
   * is noise. The `<time>` stays either way, because that is the fact.
   */
  it("leaves the page unnamed where the page is the screen", () => {
    const { container } = render(<UnreadableChangeCard change={change} />)

    expect(screen.queryByText("Autumn arrivals")).toBeNull()
    expect(container.querySelector("time")?.textContent).toContain("30 July 2026")
  })

  /**
   * The reader's next question after "what is this", and the one a disabled
   * pair of buttons would leave them guessing at. The card says it rather than
   * rendering a greyed-out *Apply this change*.
   */
  it("says why there is nothing to press", () => {
    render(<UnreadableChangeCard change={change} page={page} />)

    expect(screen.getByText(/nothing here to say yes or no to/u)).toBeTruthy()
  })

  /**
   * A queue teaches a reader that rows leave when they are answered. This one
   * never will, and it must not send them to the page either — the page screen
   * reads the same store and fails on the same row.
   */
  it("says waiting will not clear it, and does not send the reader to the page", () => {
    const { container } = render(<UnreadableChangeCard change={change} page={page} />)

    expect(screen.getByText(/Waiting won't clear it/u)).toBeTruthy()
    expect(screen.getByText(/neither will opening the page/u)).toBeTruthy()
    expect(container.querySelector("a")).toBeNull()
  })

  /**
   * The governing principle, as a property. No sentence this card shows unasked
   * uses a word out of the runtime's vocabulary, and this is the card where
   * that is hardest: the honest technical account of the row uses four of them.
   */
  it("says all of that without a single runtime word on the surface", () => {
    const { container } = render(<UnreadableChangeCard change={change} page={page} />)

    /*
     * The disclosure is cut out rather than left in, and that is the difference
     * between this assertion and a weaker one that happens to pass. jsdom reads
     * a closed `details` into `textContent`, so a check over the whole card
     * would be judging the technical record by the plain-language rule — which
     * is the rule inverted. The record is *allowed* the runtime's words; that is
     * what it is for.
     */
    for (const details of container.querySelectorAll("details")) details.remove()

    expect(runtimeWordsIn(container.textContent ?? "", ["id"])).toEqual([])
  })

  /**
   * Nothing is removed to make the surface calm. The account of which field
   * disagreed is the only thing that tells two of these apart and the only
   * thing the person who can actually fix it needs — it is one click down, not
   * gone.
   */
  it("keeps the whole technical record one click away", () => {
    const { container } = render(<UnreadableChangeCard change={change} page={page} />)
    const disclosure = container.querySelector("details")

    /*
     * The account is *inside* a closed disclosure rather than absent from the
     * markup — asserting on `textContent` would pass whether it was one click
     * down or on the surface, because jsdom reads a closed `details` too.
     */
    expect(disclosure?.open).toBe(false)
    expect(disclosure?.textContent).toContain("a stored hold did not parse: disposition")
    expect(disclosure?.textContent).toContain("p_3f2a")

    openDisclosures(container)

    expect(container.querySelector("details")?.open).toBe(true)
  })

  /**
   * The reassurance that is load-bearing rather than decorative: 0175's rule is
   * that a listing skips the row it cannot read instead of failing the page, so
   * the changes beside this one really are still answerable. A reader who
   * assumed the opposite would stop trusting a queue that is working.
   */
  it("says the rest of the page is unaffected, where the account is", () => {
    const { container } = render(<UnreadableChangeCard change={change} page={page} />)
    openDisclosures(container)

    expect(container.textContent).toContain("everything else on this page is still answerable")
  })

  /** An unnamed page still renders — a row is never dropped for want of a name. */
  it("draws for a page whose name could not be read", () => {
    render(
      <UnreadableChangeCard
        change={change}
        page={{ name: UNTITLED, treeId: "t_1", derived: false }}
      />
    )

    expect(screen.getByText("This change can’t be read.")).toBeTruthy()
  })
})
