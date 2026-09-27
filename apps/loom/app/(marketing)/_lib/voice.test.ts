import type { ElementNode, LoomNode } from "@jam-overture/loom"
import { beforeAll, describe, expect, it } from "vitest"

import { RESERVED_VOCABULARY } from "./copy"
import { pageTreeFor, treeFor } from "./render"
import { DEFAULT_THEME, HOME, SITE_ROUTES, type SiteRoute } from "./site"
import { uses, wordsOf } from "./words"

/**
 * Who the site is written for, held to by a test.
 *
 * The maintainer read the front door against `nextjs.org` on 20 August and said
 * the copy was heavy on technical jargon. It was, and the reason is worth
 * naming: **nothing stopped it.** Every other property this site claims — a
 * re-theme touching only the root, no color below it, every surface reachable
 * — has an assertion behind it, so a run that broke one found out. The register
 * had nothing, so it drifted a sentence at a time, each one defensible on its
 * own, until the third band of the landing page was four of our nouns in a row.
 *
 * A word is not jargon in the abstract. It is jargon **here**, on the page a
 * stranger arrives at, and it is perfectly good three clicks in — so the rule is
 * about place rather than about vocabulary:
 *
 * - **The front door may not use a reserved word at all.**
 * - **A mechanism page may, once it has said the same thing plainly first** —
 *   the plain phrase earlier on the page, the word after it.
 *
 * The second rule is the one that keeps this from being censorship. `delta` and
 * `the Gate` are the right words for what they name, and the documentation
 * should use them freely; what a visitor cannot be asked to do is meet them
 * cold.
 */

/**
 * The page as it is *served*, not as its builder leaves it.
 *
 * This read `treeFor` until 24 August, which was the tree before anything the
 * route supplies at request time. That was adequate while every such addition
 * was itself written in the register — and stopped being adequate the moment
 * the mechanism page started printing the runtime's own lines, which are
 * written for a logging system and are the one place on this site our
 * vocabulary arrives whether anybody chose it or not. A register test that
 * cannot see the machinery is a register test that passes for the wrong reason.
 */
const pageWords = async (route: SiteRoute): Promise<string> =>
  wordsOf((await pageTreeFor(route, { origin: "https://loom.example", theme: DEFAULT_THEME })).root)

/**
 * The opening band, wherever it sits in the tree.
 *
 * Found by type rather than by position, because "the hero is the second child"
 * is a fact about today's page that a re-ordered band would quietly break — and
 * this assertion failing quietly is the whole thing it exists to prevent.
 */
const heroOf = (route: SiteRoute): ElementNode => {
  const find = (node: LoomNode): ElementNode | undefined =>
    node.kind === "element" && node.type === "loom.hero"
      ? node
      : node.kind === "text"
        ? undefined
        : node.children.reduce<ElementNode | undefined>(
            (found, child) => found ?? find(child),
            undefined
          )

  const hero = find(treeFor(route, { origin: "https://loom.example", theme: DEFAULT_THEME }).root)

  if (hero === undefined) throw new Error(`loom: ${route.path} has no hero band`)

  return hero
}

describe("the front door", () => {
  let words = ""

  beforeAll(async () => {
    words = await pageWords(HOME)
  })

  /**
   * The strict half, and it is strict on purpose. Someone arriving at `/` has no
   * context at all, and a word they have to look up is a word that sends them
   * somewhere else to look it up.
   */
  it.each(RESERVED_VOCABULARY)("never says %s to someone who has just arrived", (term) => {
    expect(uses(words, term)).toBe(false)
  })

  it("says what the product does for the reader, in the reader's words", () => {
    /**
     * Not a proxy for good writing — nothing is. It is the one habit from the
     * reference that a test can hold: the reader is in the sentence.
     */
    expect(words.toLowerCase()).toContain("your page")
    expect(words.toLowerCase()).toContain("your rules")
  })
})

describe("every page's opening band", () => {
  it.each(SITE_ROUTES)("$path meets nobody with a word they do not have", (route) => {
    const opening = wordsOf(heroOf(route))

    for (const term of RESERVED_VOCABULARY) {
      expect({ route: route.path, term, uses: uses(opening, term) }).toEqual({
        route: route.path,
        term,
        uses: false,
      })
    }
  })

  /**
   * One idea per sentence. Thirty words is not a style, it is the point at which
   * a sentence has started carrying two — and the sentence this replaced carried
   * four clauses and forty-five words on the first screen of the site.
   */
  it.each(SITE_ROUTES)("$path keeps its opening sentences short enough to follow", (route) => {
    const sentences = wordsOf(heroOf(route))
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 0)

    for (const sentence of sentences) {
      expect({ sentence, words: sentence.split(/\s+/).length }).toEqual({
        sentence,
        words: expect.any(Number),
      })
      expect(sentence.split(/\s+/).length).toBeLessThanOrEqual(30)
    }
  })
})

/**
 * **The exemption is gone, and that is the maintainer's instruction of
 * 26 September made into a test.**
 *
 * The rule used to be about *place*: the front door may not use a reserved word
 * at all, and a mechanism page may, once it has said the same thing plainly
 * first. The second half existed because `/how-it-works` printed the runtime's
 * own lines — 341 lines of JSON in which our vocabulary arrives whether anybody
 * chose it or not — and a glossary introduced five of our words before the page
 * used them.
 *
 * That panel and that glossary are both gone. What is left is the simpler rule
 * the maintainer asked for: **no page of this site uses one of these words,
 * anywhere.** The vocabulary is the documentation's to teach, and a marketing
 * site that has to define its terms before it can make its point is a marketing
 * site making the wrong point.
 *
 * Swept over every route rather than named page by page, so a fourth page
 * cannot arrive without it.
 */
describe("every page of this site", () => {
  it.each(
    SITE_ROUTES.flatMap((route) => RESERVED_VOCABULARY.map((term) => [route, term] as const))
  )("$0.path never says %s", async (route, term) => {
    expect({ route: route.path, term, uses: uses(await pageWords(route), term) }).toEqual({
      route: route.path,
      term,
      uses: false,
    })
  })
})

/**
 * US spelling, everywhere a visitor reads.
 *
 * **The maintainer's third instruction of 26 September**, and the only one of
 * the four that is a property rather than a judgement call — which is why it is
 * a test rather than a pass somebody did once. A site edited by seven routines
 * with no memory of each other will drift back into *colour* and *behaviour*
 * within a week of anybody fixing it by hand, and nothing would say so.
 *
 * It reads the words a page actually renders rather than grepping the source,
 * for the same reason the register test does: most of the copy on this site is
 * props rather than text nodes, and a scan that missed those would have been
 * reporting a clean site while every feature title went unread. Identifiers and
 * comments are deliberately out of scope — the instruction was about the page.
 */
const BRITISH = new RegExp(
  [
    "colou?rs?",
    "coloured",
    "behaviours?",
    "honou?r(ed|s)?",
    "favou?rites?",
    "neighbou?rs?",
    "centre[ds]?",
    "theatre",
    "metres?",
    "organis(e|ed|ing|ation)",
    "recognis(e|ed|ing)",
    "realis(e|ed|ing)",
    "apologis(e|ed|ing)",
    "emphasis(e|ed|ing)",
    "analys(e|ed|ing)",
    "catalogues?",
    "dialogues?",
    "defence",
    "licence",
    "practis(e|ed|ing)",
    "travelled",
    "cancelled",
    "labelled",
    "modelled",
    "signalling",
    "whilst",
    "amongst",
    "learnt",
    "spelt",
    "grey",
    "programme",
    "judgement",
    "ageing",
    "sizeable",
    "towards",
    "offence",
    "storey",
    "cheque",
    "tyres?",
    "plough",
    "draught",
    "kerb",
    "pyjamas",
    "aluminium",
    "maths",
  ].join("|"),
  "gi"
)

describe("the spelling a reader meets", () => {
  it.each(SITE_ROUTES)("$path is written in US English", async (route) => {
    const found = [...(await pageWords(route)).matchAll(BRITISH)].map((match) => match[0])

    expect({ route: route.path, british: [...new Set(found)] }).toEqual({
      route: route.path,
      british: [],
    })
  })
})

/**
 * No price, anywhere, until there is one.
 *
 * **The maintainer's instruction of 27 September**, given in the same breath as
 * settling the licence: *no reference to pricing should remain, we haven't
 * figured that out yet.* There was none to remove — the front door's pricing
 * band went on 21 August and the site has been silent since — so this is the
 * instruction held rather than obeyed once.
 *
 * It is worth holding precisely because the site is silent. A page nobody is
 * editing does not drift; a page being rewritten weekly by a routine with no
 * memory of this conversation does, and the sentence that would do it — *free
 * to start*, *from $0*, *per seat* — is the kind a run writes without thinking
 * because every other marketing site has one.
 *
 * The structured data is covered separately and more strictly by
 * `UNMADE_CLAIMS`, which denies `offers` and `price` as fields. This is the
 * half a reader sees.
 *
 * **`cost` is deliberately not caught.** `PRODUCT_SURFACES` prices each
 * destination in *attention* — *Costs you a click*, *Costs you an afternoon* —
 * which is the most useful thing that band says and is not a price.
 */
const PRICED = new RegExp(
  [
    "[$£€]\\s?\\d",
    "\\b\\d+\\s?(usd|eur|gbp)\\b",
    "\\bper (seat|user|month|year|developer)\\b",
    "\\b(a|per) month\\b",
    "/mo\\b",
    "\\bpricing\\b",
    "\\bsubscription\\b",
    "\\b(free|paid|pro|starter|enterprise|premium) (tier|plan)\\b",
    "\\bfree forever\\b",
    "\\bstarts? at\\b",
    "\\bbilled\\b",
    "\\btrial\\b",
  ].join("|"),
  "gi"
)

describe("what the site says about what it costs", () => {
  it.each(SITE_ROUTES)("$path names no price and no plan", async (route) => {
    const found = [...(await pageWords(route)).matchAll(PRICED)].map((match) => match[0])

    expect({ route: route.path, priced: [...new Set(found)] }).toEqual({
      route: route.path,
      priced: [],
    })
  })
})
