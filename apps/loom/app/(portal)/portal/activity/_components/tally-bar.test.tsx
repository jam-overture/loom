import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { EPISODE_RESOLUTION_KINDS, type EpisodeTally } from "@jam-overture/loom/telemetry"

import { TallyBar } from "./tally-bar"

/**
 * The tally used to be four monospace pairs — `asks`, `proposals`, `held`,
 * `repairs` — over a row of chips labelled with the runtime's resolution kinds.
 * Somebody who had not read 0002 could not have told you which of those numbers
 * meant "something needs you".
 *
 * All four are still rendered. What these pin is that the sentence answering the
 * reader's actual question comes first, and that no zero was dropped on the way.
 */

const tallyOf = (byResolution: Partial<EpisodeTally["byResolution"]> = {}): EpisodeTally => ({
  episodes: 4,
  proposals: 5,
  held: 2,
  repairs: 1,
  byResolution: {
    committed: 0,
    refused: 0,
    "awaiting-answer": 0,
    discarded: 0,
    "not-interpreted": 0,
    "not-writable": 0,
    failed: 0,
    open: 0,
    ...byResolution,
  },
})

describe("TallyBar", () => {
  it("leads with whether anything is waiting on the reader", () => {
    render(<TallyBar tally={tallyOf({ committed: 2, "awaiting-answer": 2 })} />)

    expect(screen.getByText(/2 are waiting on you to say yes or no/)).toBeTruthy()
  })

  it("says so out loud when nothing is", () => {
    render(<TallyBar tally={tallyOf({ committed: 4 })} />)

    expect(screen.getByText(/Nothing here is waiting on you/)).toBeTruthy()
  })

  /**
   * "Not allowed: 0" and no refused count at all are different claims, and only
   * a view that always renders both makes the first readable as a fact.
   */
  it("renders a chip for every resolution, including the ones at zero", () => {
    render(<TallyBar tally={tallyOf({ committed: 4 })} />)

    const chips = screen.getAllByRole("listitem")

    expect(chips).toHaveLength(EPISODE_RESOLUTION_KINDS.length)
  })

  /** The chips are what a reader scans, so none of them may be a runtime kind. */
  it("labels the chips in a person's words", () => {
    render(<TallyBar tally={tallyOf({ committed: 4 })} />)

    for (const chip of screen.getAllByRole("listitem")) {
      expect(chip.textContent ?? "", chip.textContent ?? "").not.toMatch(
        /not-interpreted|not-writable|awaiting-answer|committed/
      )
    }
    expect(screen.getByText(/Waiting on you/)).toBeTruthy()
    expect(screen.getByText(/Not understood/)).toBeTruthy()
  })

  /**
   * Nothing is removed to make a screen simple. `held` and `repairs` are what
   * somebody reconciling this page against the journal counts, and they are
   * still spelled exactly as the fold spells them.
   */
  it("keeps all four raw counts, one click down", () => {
    const { container } = render(<TallyBar tally={tallyOf({ committed: 4 })} />)
    const disclosure = container.querySelector("details")

    expect(disclosure).toBeTruthy()
    expect(disclosure?.open).toBe(false)
    for (const word of ["asks", "proposals", "held", "repairs"]) {
      expect(disclosure?.textContent).toContain(word)
    }
  })

  /** And the reader never meets those four words before opening it. */
  it("puts none of the raw counts in front of the reader unasked", () => {
    const { container } = render(<TallyBar tally={tallyOf({ committed: 4 })} />)
    const disclosure = container.querySelector("details")
    const disclosureText = disclosure?.textContent ?? ""
    const unasked = (container.textContent ?? "").replace(disclosureText, "")

    expect(unasked).not.toContain("repairs")
    expect(unasked).not.toContain("proposals")
  })
})
