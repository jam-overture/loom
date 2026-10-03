import { describe, expect, it } from "vitest"

import { STANDING_ROW } from "./what-each-row-says"
import { willSayOf } from "./what-it-will-say"
import type { AskStanding } from "./what-it-will-say"

const STANDINGS: readonly AskStanding[] = ["on-its-own", "asks-you", "refuses"]

describe("STANDING_ROW", () => {
  /**
   * Total over the type rather than over the three the demo's own presets
   * reach today. A fourth outcome added to `AskStanding` is a failing test here
   * on the day it lands, rather than a blank badge at the end of a row.
   */
  it("has a word for every answer the Gate can give", () => {
    for (const standing of STANDINGS) {
      expect(STANDING_ROW[standing]?.length).toBeGreaterThan(0)
    }

    expect(new Set(Object.values(STANDING_ROW)).size).toBe(STANDINGS.length)
  })

  /**
   * Forward tense, like every string on the arrival screen, and for the same
   * reason: none of it has happened. The past tense belongs on the card, after
   * a press, where it is true.
   */
  it("speaks about a press nobody has made", () => {
    for (const word of Object.values(STANDING_ROW)) {
      expect(word).not.toMatch(/\b(did|was|went|asked|applied|has)\b/i)
    }
  })

  /**
   * Shorter than the sentence it shortens, every time. The row's job is
   * contrast down a list; the moment it grows to a sentence it is the record
   * dumped on arrival, four times over.
   */
  it("is shorter than the verdict it stands in for", () => {
    const sentence = willSayOf({
      kind: "awaiting-confirmation",
      assessment: { stakes: { level: "medium" } },
    } as never)

    expect(sentence).toBeDefined()
    expect(STANDING_ROW["asks-you"].length).toBeLessThan(sentence!.lead.length)
  })

  /**
   * The second person is the point: what is being governed is the reader's own
   * page, and the one who gets asked is the one reading the row.
   */
  it("tells the reader it is them who gets asked", () => {
    expect(STANDING_ROW["asks-you"]).toMatch(/\byou\b/i)
  })
})
