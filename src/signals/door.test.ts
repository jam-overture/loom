import { describe, expect, it } from "vitest"

import { DEFAULT_AUDIENCE_ID } from "../audience/audience.js"
import { TREE } from "../testing/reader-signal-contract.js"

import { doorOf, type RevisionPageViews } from "./index.js"

/**
 * The scale three readings share, tested once where it lives.
 *
 * It was two hand-written copies of one rule before a third reading needed it,
 * and the fact worth pinning here is the one a copy could get wrong quietly:
 * which of the three door states a row is in, and that the weight is a minimum
 * of two whole numbers rather than a division.
 */

const row = (counts: Partial<RevisionPageViews> = {}): RevisionPageViews => ({
  audienceId: DEFAULT_AUDIENCE_ID,
  audiences: [DEFAULT_AUDIENCE_ID],
  treeId: TREE,
  revision: 1,
  opened: 0,
  appearances: 0,
  updatedAt: "2026-10-14T00:00:00.000Z",
  drift: 0,
  pending: 0,
  inflation: null,
  ...counts,
})

describe("the scale a page's door counts in", () => {
  it("weighs a page by the page views a rollup folded, at the door's scale", () => {
    const door = doorOf(row({ opened: 100, appearances: 140, drift: 40, inflation: 0.4 }))

    expect(door.counted).toBe(100)
    expect(door.opened).toBe(100)
    expect(door.appearances).toBe(140)
    expect(door.drift).toBe(40)
    expect(door.silence).toBe(null)
  })

  /**
   * Taken as a minimum and not as `appearances ÷ (1 + inflation)`, because the
   * division of three floats agrees with it to fifteen places and not to
   * sixteen (0229).
   */
  it("takes the weight as a whole number, which the division it stands for is not", () => {
    const door = doorOf(row({ opened: 3, appearances: 7, drift: 4, inflation: 4 / 3 }))

    expect(door.counted).toBe(3)
    expect(Number.isInteger(door.counted)).toBe(true)
    expect(7 / (1 + 4 / 3)).not.toBe(3)
  })

  it("keeps the page views waiting to be folded, which weigh nothing yet", () => {
    const door = doorOf(row({ opened: 25, appearances: 10, pending: 15 }))

    expect(door.counted).toBe(10)
    expect(door.pending).toBe(15)
    expect(door.silence).toBe(null)
  })

  /**
   * The three reasons in the order a page's own reading tries them in: no row
   * before nothing opened, because *there is no row* is a state a deployment can
   * be in without its senders being at fault.
   */
  it("tells a missing row, an unmarked opening and an unfolded window apart", () => {
    expect(doorOf(null).silence).toBe("unmeasured")
    expect(doorOf(null).opened).toBe(0)
    expect(doorOf(row({ opened: 0, appearances: 10 })).silence).toBe("unopened")
    expect(doorOf(row({ opened: 10, appearances: 0, pending: 10 })).silence).toBe("uncounted")
  })

  it("carries the openings of a page it cannot scale, because arrivals are counted either way", () => {
    const door = doorOf(row({ opened: 10, appearances: 0, pending: 10 }))

    expect(door.opened).toBe(10)
    expect(door.counted).toBe(0)
  })
})
