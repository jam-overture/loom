import { describe, expect, it } from "vitest"

import type { DemoPresetId } from "./presets"
import { WHAT_ELSE_SENTENCE, whatElseToAsk } from "./what-else"

/**
 * The reading on its own, with no pipeline anywhere.
 *
 * `rail.test.ts` holds that the demo's own three readings are the ones handed
 * in, over records the pipeline really produced. What is held here is **when
 * the rail has an ending and when it has nothing to say**, which is the whole
 * of this module: three silences and one sentence.
 */

const ASKS: readonly DemoPresetId[] = ["palette", "backdrop", "band", "promote"]

describe("whatElseToAsk", () => {
  /**
   * The screen this module exists for: the end of the one sequence the demo
   * invites, where the ask panel and its green button are above the viewport
   * and the only control on screen undoes what the visitor came to see.
   */
  it("speaks once a change the visitor pressed for is on the page", () => {
    const end = whatElseToAsk({ available: ASKS, landing: "rec-1" })

    expect(end?.count).toBe(4)
    expect(end?.label).toBe("4 more changes to ask for")
    expect(end?.sentence).toBe(WHAT_ELSE_SENTENCE)
  })

  /**
   * The arrival screen is untouched, and that is asserted here rather than
   * left to a screenshot: `landing` is the rail's reading of whether the
   * revision the page is at was produced by this visitor's own press, and
   * before the first press there is no loop to have closed.
   */
  it("says nothing before anything has landed", () => {
    expect(whatElseToAsk({ available: ASKS })).toBeUndefined()
  })

  /**
   * A visitor with a question open has a next move already, with a green
   * button under it, and `set-aside.ts` is pinned above the list saying what
   * asking for something else would cost them. A row counting other asks
   * underneath that is the surface arguing with its own caution.
   */
  it("says nothing while a question is still waiting on the visitor", () => {
    expect(
      whatElseToAsk({ available: ASKS, landing: "rec-1", waiting: { questions: 1 } })
    ).toBeUndefined()
  })

  /**
   * A link to an empty panel is the silently-dead control this demonstration
   * argues against, and the sentence goes with it rather than standing alone —
   * it is a caption on the way on, and there is no way on.
   */
  it("says nothing when there is nothing left to ask for", () => {
    expect(whatElseToAsk({ available: [], landing: "rec-1" })).toBeUndefined()
  })

  it("counts one ask in the singular", () => {
    expect(whatElseToAsk({ available: ["palette"], landing: "rec-1" })?.label).toBe(
      "1 more change to ask for"
    )
  })

  /**
   * The count is `stillToAsk`'s, planned against the tree as it stands after
   * the change — so a visitor who presses the link finds exactly that many
   * rows. It is the same discipline the arrival screen's split holds: a number
   * the next press checks.
   */
  it("counts what is on offer rather than what the table has", () => {
    expect(whatElseToAsk({ available: ["palette", "band"], landing: "rec-1" })?.count).toBe(2)
  })

  /**
   * The sentence is the half of the brief's objective nothing on this surface
   * says. It is held to the word because it is the claim rather than copy: the
   * page moving is what any demonstration shows, and *whether or not anyone
   * was watching* is why the record is the product.
   */
  it("says why the record matters, in words with no runtime in them", () => {
    expect(WHAT_ELSE_SENTENCE).toContain("whether or not anyone was watching")
    expect(WHAT_ELSE_SENTENCE).not.toMatch(/polic|revision|stakes|rule|proposal/i)
  })
})
