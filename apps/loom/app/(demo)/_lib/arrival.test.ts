import { describe, expect, it } from "vitest"

import { ANSWER_ARRIVES, clearanceFor, roomToLand } from "./arrival"

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

/**
 * The third half, added after the two above were measured coming back on a
 * branch that changed neither of them.
 *
 * Folding the explainer took about three hundred pixels out of the rail, and
 * the scroller then ran out of travel 404 pixels before the card reached the
 * top — so `ANSWER_ARRIVES` went on saying `start`, `clearanceFor` went on
 * returning nothing, both tests above went on passing, and the caution was
 * back on the frame the demo's one invited press produces. A landing the
 * layout can silently withdraw is not a landing.
 */
/**
 * Stands in for the caution the rail pins while a question is open. `roomToLand`
 * reads whether the field is there and never what is in it, which is what lets
 * it be handed the rail itself rather than a boolean a Server Component works
 * out where no test can see it.
 */
const SET_ASIDE = { line: "One question is still waiting on you." }

describe("the room the card needs to land in", () => {
  it("is given while a question is waiting", () => {
    expect(roomToLand({ waiting: SET_ASIDE })).toBe("lg:pb-[70vh]")
  })

  /**
   * **And for one press longer**, which is the half that was missing. The room
   * was taken back the moment the question was answered — the press that
   * produces the frame the whole demonstration is for — and with it gone the
   * rail may no longer be able to put the payoff card at its own top: at 606px
   * of card the furthest the rail can scroll is 623 against a card top of 740,
   * so the landing is a clamp. What a stranger saw of that frame was decided by
   * whether the card was taller or shorter than the rail.
   */
  it("is given for the change the visitor's answer just landed", () => {
    expect(roomToLand({ landing: "i_2" })).toBe("lg:pb-[70vh]")
  })

  /**
   * And not otherwise. On arrival the rail is barely taller than the viewport,
   * so trailing room would make the demo's default state — the one a stranger
   * judges — scroll into emptiness.
   */
  it("is nothing at all when nothing is waiting and nothing just landed", () => {
    expect(roomToLand({})).toBe("")
  })

  /**
   * A change that applied on its own is not a landing this file owes room to:
   * nothing is being carried to the top of the rail for it, because nobody was
   * asked anything (`landed.ts`).
   */
  it("is nothing at all for a change nobody answered", () => {
    expect(roomToLand({ waiting: undefined, landing: undefined })).toBe("")
  })

  /**
   * Wide only, and stated as a property rather than by reading the string
   * twice: on a phone the document scrolls and the card reaches the top by
   * ordinary means, so an unprefixed padding would be dead space on the screen
   * with the least of it to spare.
   */
  it("applies only where the rail is a scroller of its own", () => {
    expect(
      roomToLand({ waiting: SET_ASIDE })
        .split(" ")
        .every((token) => token.startsWith("lg:"))
    ).toBe(true)
  })

  /**
   * A viewport unit rather than a length, because the shortfall is
   * `viewport − card − what follows it` and therefore grows with the screen: a
   * rem value measured on a laptop is short on a monitor.
   */
  it("is measured against the viewport", () => {
    expect(roomToLand({ waiting: SET_ASIDE })).toContain("vh")
  })
})
