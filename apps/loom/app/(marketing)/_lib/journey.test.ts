import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { JOURNEY, ordinal, PLAIN_WORDS, PLAIN_WORDS_LABEL, spell, spellCapitalised, STEPS } from "./journey"
import { GLOSSARY } from "./pages/how-it-works"
import { pageTreeFor, renderTree, trailFor } from "./render"
import { HOME, HOW_IT_WORKS, DEFAULT_THEME, type SiteRoute } from "./site"

/**
 * The site says one number about itself.
 *
 * These are held against the **rendered pages** rather than against
 * `journey.ts`, which is the only version of them worth having: a test that
 * read the list and compared it to itself would pass however either page was
 * built, and passing however the page was built is exactly what the six typed
 * literals did for sixteen runs.
 *
 * The defect this file exists for was on the first screen of the front door and
 * nothing on this site could see it. `/` said *Every change takes the same four
 * steps* directly above a button leading to `/how-it-works`, headed *Five
 * steps, every time, in the same order*. Both sentences were true of what they
 * described — four nouns and five pipeline stages — and neither knew the other
 * existed.
 */

const ORIGIN = "https://loom.example"

const markupOf = async (route: SiteRoute): Promise<string> =>
  renderToStaticMarkup(
    renderTree(await pageTreeFor(route, { origin: ORIGIN, theme: DEFAULT_THEME })).element
  ).replaceAll("&#x27;", "'")

/**
 * Every English count of the steps a page could be caught spelling.
 *
 * The assertion below is a *negative* one, so the list it searches for has to
 * be wider than the answer: checking only that the right number is present
 * would pass a page that said both.
 */
const OTHER_COUNTS: readonly string[] = ["two", "three", "four", "five", "six", "seven"].filter(
  (word) => word !== STEPS
)

describe("the number of steps, as the site states it", () => {
  it("is spelled the same way on the front door and on the mechanism page", async () => {
    const home = await markupOf(HOME)
    const mechanism = await markupOf(HOW_IT_WORKS)

    for (const markup of [home, mechanism]) {
      for (const wrong of OTHER_COUNTS) {
        expect(markup).not.toContain(`${wrong} steps`)
      }
    }

    expect(mechanism).toContain(`${spellCapitalised(JOURNEY.length)} steps, every time`)
    expect(mechanism).toContain(`The ${STEPS} steps above`)
  })

  /**
   * The one the front door failed.
   *
   * The band under the hero is four plain words and it is not a list of steps.
   * What it may not do is put a step count on the first screen, because the
   * page one click away puts a different one on its own.
   */
  it("is never claimed by the band of plain words on the front door", async () => {
    const home = await markupOf(HOME)

    expect(home).toContain(PLAIN_WORDS_LABEL)
    expect(PLAIN_WORDS_LABEL).not.toContain("step")
    expect(PLAIN_WORDS_LABEL).toContain(spell(PLAIN_WORDS.length))

    for (const word of PLAIN_WORDS) {
      expect(home).toContain(`>${word}<`)
    }
  })

  it("names every step of the list, in order, on the mechanism page", async () => {
    const mechanism = await markupOf(HOW_IT_WORKS)

    const positions = JOURNEY.map((step) => mechanism.indexOf(step.title))

    expect(positions.every((at) => at >= 0)).toBe(true)
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
  })
})

/**
 * The record's own lines, counted off the record.
 *
 * The mechanism page prints a real paper trail and then says three things about
 * how long it is. All three were typed, and two of them disagreed with each
 * other: the refusal band was headed *The same five lines* above a sentence
 * reading *the first four lines read exactly as they do above*.
 *
 * The three the refusal band states are positions in the **refused** run, and
 * are checked here against each other rather than against the run printed above
 * it — which is what they were quietly read off while that run could only ever
 * be one length. `the-record-of-your-ask.test.ts` is where they are held against
 * a page whose two runs differ.
 */
describe("the number of lines, as the page printing them states it", () => {
  it("counts the trail it is showing rather than a number typed beside it", async () => {
    const context = { origin: ORIGIN, theme: DEFAULT_THEME }
    const trail = await trailFor(context)
    const mechanism = await markupOf(HOW_IT_WORKS)

    expect(mechanism).toContain(
      `${spellCapitalised(trail.lines.length)} lines for the ${STEPS} steps above`
    )
  })

  it("does not head the refusal with a different count from the sentence under it", async () => {
    const mechanism = await markupOf(HOW_IT_WORKS)

    const heading = /The same (\w+) kinds of line, and then a different answer/.exec(mechanism)
    const sentence = /it reaches the same (\w+) kinds of line as the run above/.exec(mechanism)

    expect(heading?.[1]).toBeDefined()
    expect(sentence?.[1]).toBeDefined()
    expect(heading?.[1]).toBe(sentence?.[1])
  })

  it("counts the glossary it is introducing rather than a number typed above it", async () => {
    const mechanism = await markupOf(HOW_IT_WORKS)

    expect(mechanism).toContain(`${spellCapitalised(GLOSSARY.length)} of our words appear`)

    for (const entry of GLOSSARY) {
      expect(mechanism).toContain(entry.term)
    }
  })

  it("says the verdict line is the one after the lines that match", async () => {
    const mechanism = await markupOf(HOW_IT_WORKS)

    const matching = /reaches the same (\w+) kinds of line/.exec(mechanism)?.[1]
    const at = /and then this, its (\w+)\./.exec(mechanism)?.[1]
    const absent = /There is no (\w+), because nothing happened/.exec(mechanism)?.[1]

    const count = ["no", "one", "two", "three", "four", "five", "six", "seven"].indexOf(
      matching as string
    )

    expect(count).toBeGreaterThan(0)
    expect(at).toBe(ordinal(count + 1))
    expect(absent).toBe(ordinal(count + 2))
  })
})

/**
 * The helpers, at their edges.
 *
 * Both are used to compose sentences a visitor reads, so the interesting cases
 * are the ones that would put something ungrammatical on a published page
 * rather than throw where somebody would see it.
 */
describe("spelling a count", () => {
  it("spells the small numbers a sentence about this site can reach", () => {
    expect(spell(0)).toBe("no")
    expect(spell(4)).toBe("four")
    expect(spell(10)).toBe("ten")
  })

  /**
   * Raised from ten to twenty on 13 September for `/who-can-ask`, whose band is
   * four requests put by four askers and whose claim is *sixteen answers*. The
   * boundary is still asserted rather than removed — past twenty a marketing
   * sentence should not be counting, and a numeral is a better failure than a
   * wrong word.
   */
  it("spells as far as a band on this site deliberately counts", () => {
    expect(spell(16)).toBe("sixteen")
    expect(spell(20)).toBe("twenty")
  })

  it("falls back to digits rather than throwing on a page a visitor is loading", () => {
    expect(spell(21)).toBe("21")
    expect(spell(-1)).toBe("-1")
    expect(spell(2.5)).toBe("2.5")
    expect(ordinal(99)).toBe("99th")
  })

  it("capitalises for the headline that opens with the count", () => {
    expect(spellCapitalised(JOURNEY.length)).toBe("Five")
    expect(spellCapitalised(16)).toBe("Sixteen")
    expect(spellCapitalised(21)).toBe("21")
  })

  it("names the positions the refusal band points at", () => {
    expect(ordinal(1)).toBe("first")
    expect(ordinal(5)).toBe("fifth")
    expect(ordinal(6)).toBe("sixth")
  })
})
