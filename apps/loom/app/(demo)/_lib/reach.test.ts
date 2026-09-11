import { describe, expect, it } from "vitest"

import { reachFor, type Reach } from "./reach"
import type { SpotTone } from "./spotlight"

/**
 * The two sentences a visitor reads at the one moment this surface has nothing
 * else on screen.
 *
 * There is no markup here to check — what is asserted is the property the whole
 * unit rests on: that a mark of either tone has a way back with words on it, and
 * that the words are the demo's plain voice rather than the runtime's. A tone
 * added to `SpotTone` with no entry here would be a change that carries a
 * visitor away from the record and leaves them there, and nothing else in this
 * repository would notice.
 */

const TONES: readonly SpotTone[] = ["applied", "awaiting"]

describe("the way back to the record", () => {
  it("has a sentence and a verb for every tone a mark can carry", () => {
    for (const tone of TONES) {
      const reach: Reach = reachFor(tone)

      expect(reach.said, tone).not.toHaveLength(0)
      expect(reach.action, tone).not.toHaveLength(0)
    }
  })

  /**
   * The words the specimen page is forbidden from saying are forbidden here for
   * a different reason. The rail is Loom's voice and may say "Loom" — this is
   * the rail — but a bar that surfaces over somebody else's page in order to
   * explain itself in one line has no room to define a word, and no click
   * between the visitor and it.
   */
  it("says none of the runtime's words, in the one line that has no disclosure under it", () => {
    for (const tone of TONES) {
      const said = reachFor(tone).said.toLowerCase()

      for (const word of ["delta", "primitive", "proposal", "revision", "policy", "node"]) {
        expect(said, `${tone}: ${word}`).not.toContain(word)
      }
    }
  })

  /**
   * The claim a visitor is being brought back for. A held change is the state
   * this surface cannot proceed from — the two buttons that decide it are in the
   * rail and nothing on the page can answer them — so its sentence must be the
   * one that reads as a question rather than as a receipt.
   */
  it("asks, rather than reports, while a change is waiting on the visitor", () => {
    expect(reachFor("awaiting").said).toContain("waiting")
    expect(reachFor("applied").said).not.toContain("waiting")
  })

  /** Two different moments must not arrive wearing the same sentence. */
  it("says something different in each of them", () => {
    expect(reachFor("applied").said).not.toEqual(reachFor("awaiting").said)
    expect(reachFor("applied").action).not.toEqual(reachFor("awaiting").action)
  })
})
