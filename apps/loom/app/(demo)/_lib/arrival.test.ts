import { describe, expect, it } from "vitest"

import { ANSWER_ARRIVES, clearanceFor } from "./arrival"

/**
 * One decision held in one place, and the test is for the *pairing* rather than
 * for either half.
 *
 * Both halves were true on their own and the surface was wrong: the card was
 * carried the minimum distance, which leaves the ask panel on screen, and the
 * card reserved room for the caution pinned inside that panel — so the room it
 * reserved was where the caution was drawn, above the question, at the moment
 * of the visitor's first correct press. Nothing could have caught that, because
 * the two facts were in two files and neither was wrong about itself.
 */
describe("where the answer arrives", () => {
  /**
   * The value the whole unit turns on. `nearest` and `center` both stop with
   * the panel still in the scroller; `start` is the only one that leaves it
   * behind, and leaving it behind is what takes the caution off the frame the
   * press produced.
   */
  it("carries the card to the top of its scroller", () => {
    expect(ANSWER_ARRIVES).toBe("start")
  })

  it("leaves no room above a card that arrives at the top, because nothing can be pinned over it there", () => {
    expect(clearanceFor("start")).toBe("")
  })

  /**
   * The half that must come *back* if a later run reaches for the smaller
   * movement again. A card that stops short of the top has the panel above it,
   * the caution pins to the scroller's top edge, and a flush card lands its
   * `Waiting on you` badge behind the band that sent the visitor to it.
   */
  it.each(["nearest", "center", "end"] as const)(
    "reserves the strip's height for a card that stops at %s",
    (block) => {
      expect(clearanceFor(block)).toBe("scroll-mt-28")
    }
  )

  /**
   * The property rather than the two values: whichever landing this surface
   * picks, exactly one of *card at the top* and *room reserved above it* is
   * true. Both at once is the defect that was shipped; neither is the phone
   * screenshot that found it.
   */
  it.each(["start", "nearest", "center", "end"] as const)(
    "reserves room for exactly as long as something can be pinned above it (%s)",
    (block) => {
      expect(clearanceFor(block) === "").toBe(block === "start")
    }
  )
})
