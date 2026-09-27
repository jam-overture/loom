import type { LoomTree } from "@jam-overture/loom"
import { describe, expect, it } from "vitest"

import { spell } from "../journey"
import { treeFor } from "../render"
import { HOME, THE_RECORD, THE_RULES, type SiteThemeName } from "../site"
import { wordsOf } from "../words"
import {
  ANSWER_ORDER,
  EXCEPTIONS_SPELLED,
  answerTallyOf,
  exceptionsIn,
  whatTheChoicesDo,
  worthWatching,
} from "./answers"
import { ASKS, type Ask, type AskAnswer } from "./asks"
import { runAsk } from "./run"

/**
 * What the five choices do, and every sentence on the site that counts them.
 *
 * The band offering them told a visitor that everything except the refused one
 * *"may rearrange on its own"*, and one of the five stops and asks. The
 * assertions below are in two halves and both are needed: the declaration on
 * each ask is held against **what the real sequence returns**, and each page is
 * held against **the declaration**. Either half alone passes a site that is
 * wrong — a declaration nothing runs is a guess, and a page agreeing with a
 * guess is a page agreeing with nothing.
 */

const ORIGIN = "https://loom.example"
const THEME: SiteThemeName = "minimal"

const basePage = (): LoomTree => treeFor(HOME, { origin: ORIGIN, theme: THEME })

const wordsOn = (route: typeof HOME): string =>
  wordsOf(treeFor(route, { origin: ORIGIN, theme: THEME }).root)

describe("what this site's rules actually do with each choice", () => {
  it.each(ASKS)("$id is declared $answer and the sequence agrees", async (ask) => {
    expect((await runAsk(basePage(), ask)).record.verdict).toBe(ask.answer)
  })

  /**
   * The guarantee the old literal table in `adapt.test.ts` carried, kept and
   * made stronger.
   *
   * That table said *these five ids map to these five verdicts*, which a run
   * that changed a plan and its declaration together would satisfy while the
   * band demonstrated one answer five times. What the band is *for* is showing
   * all three, so that is what is asserted: the five exist to be one of each at
   * minimum, and the count of five is incidental to it.
   */
  it("demonstrates all three answers, which is why there are five of them", () => {
    const tally = answerTallyOf()

    for (const answer of ANSWER_ORDER) expect(tally[answer]).toBeGreaterThan(0)
  })

  it("counts every choice exactly once", () => {
    const tally = answerTallyOf()

    expect(ANSWER_ORDER.reduce((total, answer) => total + tally[answer], 0)).toBe(ASKS.length)
  })
})

describe("the sentence the count is spelled into", () => {
  it("says what today's five do", () => {
    expect(whatTheChoicesDo()).toBe(
      "Of the five above, three go through on their own, one stops and asks you first, and one is refused outright."
    )
  })

  /**
   * The plural and the singular of every clause, and the shape of a band that
   * has lost one of the three answers.
   *
   * None of these arrangements is on the site today, which is the point: the
   * sentence is composed so that a run adding or removing a choice gets prose
   * rather than *"1 requests stops"*, and a run that has to check that is a run
   * that will not check it.
   */
  const shaped = (answers: readonly AskAnswer[]): readonly Ask[] =>
    answers.map((answer, index) => ({ ...(ASKS[index % ASKS.length] as Ask), answer }))

  it.each([
    [
      ["landed", "held", "refused"] as const,
      "Of the three above, one goes through on its own, one stops and asks you first, and one is refused outright.",
    ],
    [
      ["landed", "landed"] as const,
      "Of the two above, two go through on their own.",
    ],
    [
      ["held", "held", "refused", "refused"] as const,
      "Of the four above, two stop and ask you first and two are refused outright.",
    ],
  ])("reads as English for %s", (answers, expected) => {
    expect(whatTheChoicesDo(shaped([...answers]))).toBe(expected)
  })

  it("names only the answers that occur", () => {
    expect(whatTheChoicesDo(shaped(["landed", "landed"]))).not.toContain("refused")
  })

  it("points at both exceptions rather than only the refusal", () => {
    expect(worthWatching()).toBe(
      "The two that do not simply happen are the part worth watching."
    )
    expect(worthWatching(shaped(["landed", "refused"]))).toBe(
      "The one that does not simply happen is the part worth watching."
    )
  })

  it("spells the exceptions the rules page counts off the same list", () => {
    expect(EXCEPTIONS_SPELLED).toBe(spell(exceptionsIn(answerTallyOf())))
  })
})

/**
 * And the pages, which is where it went wrong.
 *
 * Read off the rendered trees rather than off `answers.ts`, for the reason the
 * step count's tests gave on 1 September: an assertion that compares the module
 * with itself passes however the page was built, and passing however the page
 * was built is exactly what the old sentence did for sixteen runs.
 */
describe("every page that counts the choices", () => {
  it.each([HOME, THE_RECORD])("$path introduces them with what they do", (route) => {
    expect(wordsOn(route)).toContain(whatTheChoicesDo())
  })

  it("the front door also says which are worth staying for", () => {
    expect(wordsOn(HOME)).toContain(worthWatching())
  })

  it("the rules page counts the same exceptions", () => {
    expect(wordsOn(THE_RULES)).toContain(`${EXCEPTIONS_SPELLED} of them run into the rules`)
  })

  /**
   * The negative assertion, deliberately wider than the answer.
   *
   * The defect was not a missing sentence — it was a present one that was
   * wrong — so checking the right words are on the page would pass a page
   * saying both. This searches for the claim that was there and for every
   * near-miss of it a rewrite might reach for.
   */
  it.each([HOME, THE_RECORD, THE_RULES])(
    "$path never says the rest of them just happen",
    (route) => {
      const words = wordsOn(route)

      expect(words).not.toContain("Everything else a request may rearrange on its own")
      expect(words).not.toContain("will be refused, which is the part worth watching")

      for (const count of ["one", "two", "three", "four", "five", "six"]) {
        expect(words).not.toContain(`${count} of the five above will be refused`)
      }
    }
  )

  /**
   * The middle answer, by name, on the first page a stranger reads.
   *
   * This is the assertion the whole unit exists for. A front door that lists
   * every answer except *it stops and asks you* is describing a product with two
   * outcomes, which is the product everybody else has.
   */
  it("says on the front door that one of them stops and asks", () => {
    expect(wordsOn(HOME)).toContain("stops and asks you first")
  })
})
