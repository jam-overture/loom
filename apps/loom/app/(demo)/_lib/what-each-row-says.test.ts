import { describe, expect, it } from "vitest"

import { presetById } from "./presets"
import { promiseOf, PUTS_IT_BACK, STANDING_ROW } from "./what-each-row-says"
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

/**
 * The promise, once the preset's own one could stop being true.
 *
 * Driven against the real preset table rather than a literal, because what is
 * being checked is that the **shipped** sentence survives and is replaced only
 * where the history has falsified it.
 */
describe("promiseOf", () => {
  const promise = presetById("palette")?.promise ?? ""

  it("keeps the preset's own promise while the press moves the page on", () => {
    expect(promise.length).toBeGreaterThan(0)
    expect(promiseOf(promise, false)).toBe(promise)
  })

  /**
   * Absent is the arrival screen's answer and not a missing check: a row whose
   * ask reached no verdict has no direction either, and the sentence it shipped
   * with is the only honest thing left to print.
   */
  it("keeps it when nothing answered the ask at all", () => {
    expect(promiseOf(promise, undefined)).toBe(promise)
  })

  it("says what the press does to the page once it would only put it back", () => {
    expect(promiseOf(promise, true)).toBe(PUTS_IT_BACK)
    expect(promiseOf(promise, true)).not.toBe(promise)
  })

  /**
   * Forward tense and no runtime vocabulary, held to the same rule as every
   * other string on this panel. A level, a rule or a policy here would be the
   * record dumped on a row, which is what this whole surface is written against.
   */
  it("speaks about a press nobody has made, in plain words", () => {
    expect(PUTS_IT_BACK).not.toMatch(/\b(did|was|went|applied|undid)\b/i)
    expect(PUTS_IT_BACK).not.toMatch(/\b(stakes|policy|rule|revision|delta|node)\b/i)
  })

  /**
   * **Your last change**, not *the original page*. `reversesTheLastChange`
   * compares against the change immediately before and nothing earlier, so the
   * larger claim would be visibly false on a page carrying two changes.
   */
  it("claims only what the reading behind it checks", () => {
    expect(PUTS_IT_BACK).toMatch(/last change/i)
    expect(PUTS_IT_BACK).not.toMatch(/original|the way it started|how it shipped/i)
  })
})
