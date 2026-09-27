import type { ElementNode, LoomNode } from "@jam-overture/loom"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import {
  JOURNEY,
  ordinal,
  PLAIN_WORDS,
  PLAIN_WORDS_GLOSSED,
  PLAIN_WORDS_LABEL,
  spell,
  spellCapitalised,
  STEPS,
} from "./journey"
import { pageTreeFor, renderTree } from "./render"
import { HOME, HOW_IT_WORKS, DEFAULT_THEME, type SiteRoute } from "./site"
import { wordsOf } from "./words"

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
    renderTree(await pageTreeFor(route, { origin: ORIGIN, theme: DEFAULT_THEME }), { origin: ORIGIN })
      .element
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

    /**
     * The second sentence this checked — *the five steps above*, written by the
     * record band pointing back up the page — went with that band on
     * 26 September. What is left is the heading, plus the sweep above that no
     * page of this site names a different number.
     */
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
 * **The trail's own counts are gone, with the trail.**
 *
 * This block held three numbers the mechanism page printed about the record it
 * was showing — how many lines, how many kinds of line, which line carried the
 * verdict — each derived from the trail rather than typed beside it. They were
 * good assertions about a band the maintainer retired on 26 September, and a
 * derived count with nothing to derive it from is not worth keeping as a
 * fixture. The page no longer prints a record; the front door still does, in
 * sentences, and `adapt.test.ts` holds that one.
 */

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

/**
 * The band of plain words, which is four `loom.feature`s as of 20 September.
 *
 * It was a `loom.logo-cloud` of four `loom.logo`s until then — the primitive
 * for *the companies who use us*, holding a vocabulary instead of a customer
 * list. Nothing was wrong with the words and nothing here could see what was:
 * the band photographed as an empty strip, and four verbs with no object are
 * four words a stranger has not been told anything by.
 *
 * What the assertions below hold is the thing that is easy to lose again, and
 * it is not the primitive. It is that **a line under a word has to say
 * something the sentence two hundred pixels above it does not already say.**
 * The first draft of *Record* failed it — *who asked, what moved, and which of
 * your rules let it through*, against a hero promising *a record of who asked,
 * what moved, and how to put it back* — and it failed it in the way that is
 * hardest to catch by reading, because both sentences are true and each is
 * good on its own.
 */
describe("the four plain words, and the line each one carries", () => {
  const findByType = (node: LoomNode, type: string): ElementNode | undefined =>
    node.kind === "element" && node.type === type
      ? node
      : node.kind === "text"
        ? undefined
        : node.children.reduce<ElementNode | undefined>(
            (found, child) => found ?? findByType(child, type),
            undefined
          )

  /** Words alone: what two sentences share is not their punctuation. */
  const runsOf = (text: string, length: number): readonly string[] => {
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word !== "")

    return words
      .slice(0, Math.max(0, words.length - length + 1))
      .map((_, at) => words.slice(at, at + length).join(" "))
  }

  const homeTree = async () => pageTreeFor(HOME, { origin: ORIGIN, theme: DEFAULT_THEME })

  it("gives every word a line, and renders both", async () => {
    const markup = await markupOf(HOME)

    expect(PLAIN_WORDS_GLOSSED).toHaveLength(PLAIN_WORDS.length)

    for (const { word, line } of PLAIN_WORDS_GLOSSED) {
      expect(line.length).toBeGreaterThan(40)
      expect(markup).toContain(`>${word}<`)
      expect(markup).toContain(line)
    }
  })

  /**
   * The one the first draft failed.
   *
   * Five words is long enough that an ordinary shared phrase — *your rules*,
   * *the page* — passes, and short enough that a clause carried over from the
   * hero does not.
   */
  it("never repeats a five-word run of the band above it", async () => {
    const hero = findByType((await homeTree()).root, "loom.hero")

    expect(hero).toBeDefined()

    /**
     * `wordsOf` rather than a walk written here: it reads prose *props* as well
     * as text nodes, so the hero's eyebrow counts as the band above — and the
     * walk this test first carried read `node.text` on a node whose field is
     * `value`, which no assertion about a gloss would ever have caught. The
     * floor under the count below is why it was caught at all.
     */
    const above = wordsOf(hero as LoomNode)
    const aboveRuns = new Set(runsOf(above, 5))

    expect(aboveRuns.size).toBeGreaterThan(20)

    for (const { word, line } of PLAIN_WORDS_GLOSSED) {
      const repeated = runsOf(line, 5).filter((run) => aboveRuns.has(run))

      expect({ word, repeated }).toEqual({ word, repeated: [] })
    }
  })

  /**
   * The band's own rule, one layer below the label the test above this file
   * already holds: a line may not smuggle back the step count the label was
   * made to stop claiming.
   */
  it("numbers nothing, and calls nothing a step", () => {
    const counts = ["two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"]

    for (const { word, line } of PLAIN_WORDS_GLOSSED) {
      const said = line.toLowerCase()

      expect({ word, step: said.includes("step") }).toEqual({ word, step: false })
      expect({ word, digits: /\d/.test(line) }).toEqual({ word, digits: false })

      for (const count of counts) {
        expect({ word, count, said: new RegExp(`\\b${count}\\b`).test(said) }).toEqual({
          word,
          count,
          said: false,
        })
      }
    }
  })

  /**
   * Plain rather than card, and it is a judgment about the page rather than
   * about the band: the mosaic further down is the front door's one wall of
   * cards, and a second one directly under the hero makes the first screen and
   * a half read as a specification sheet.
   */
  it("is laid out plainly, so it does not become the page's second card grid", async () => {
    const grid = findByType((await homeTree()).root, "loom.feature-grid")

    expect(grid).toBeDefined()
    expect((grid as ElementNode).children).toHaveLength(PLAIN_WORDS.length)

    for (const child of (grid as ElementNode).children) {
      expect(child.kind).toBe("element")
      expect((child as ElementNode).type).toBe("loom.feature")
      expect((child as ElementNode).props["surface"]).toBe("plain")
    }
  })
})
