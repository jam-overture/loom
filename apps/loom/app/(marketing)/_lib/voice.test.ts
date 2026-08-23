import type { ElementNode, LoomNode } from "@loom/runtime"
import { describe, expect, it } from "vitest"

import { RESERVED_VOCABULARY } from "./copy"
import { treeFor } from "./render"
import { DEFAULT_THEME, HOME, HOW_IT_WORKS, SITE_ROUTES, type SiteRoute } from "./site"
import { uses, wordsOf } from "./words"

/**
 * Who the site is written for, held to by a test.
 *
 * The maintainer read the front door against `nextjs.org` on 20 August and said
 * the copy was heavy on technical jargon. It was, and the reason is worth
 * naming: **nothing stopped it.** Every other property this site claims — a
 * re-theme touching only the root, no colour below it, every surface reachable
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

const pageWords = (route: SiteRoute): string =>
  wordsOf(treeFor(route, { origin: "https://loom.example", theme: DEFAULT_THEME }).root)

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

const firstUse = (text: string, term: string): number =>
  text.toLowerCase().indexOf(term.toLowerCase())

describe("the front door", () => {
  const words = pageWords(HOME)

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
 * What a mechanism page is allowed to say, and what it has to say first.
 *
 * The plain phrase is not a definition in a glossary somewhere — it is the
 * sentence immediately before the word, doing the work. `delta` arrives after
 * the page has already said "an exact list of changes"; `the Gate` arrives after
 * "Your rules decide". Read aloud, the reader is told the thing and then told
 * what it is called, which is the order people learn words in.
 */
const GLOSSED: Readonly<Record<string, string>> = {
  delta: "exact list of changes",
  "the Gate": "Your rules decide",
}

describe("the mechanism page", () => {
  const words = pageWords(HOW_IT_WORKS)

  it("uses no reserved word it has not first said plainly", () => {
    const unglossed = RESERVED_VOCABULARY.filter(
      (term) => uses(words, term) && GLOSSED[term] === undefined
    )

    expect(unglossed).toEqual([])
  })

  it.each(Object.entries(GLOSSED))("says it plainly before it says %s", (term, plainly) => {
    expect(firstUse(words, plainly)).toBeGreaterThanOrEqual(0)
    expect(firstUse(words, plainly)).toBeLessThan(firstUse(words, term))
  })
})
