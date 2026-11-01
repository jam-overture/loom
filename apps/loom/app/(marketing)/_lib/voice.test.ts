import type { ElementNode, LoomNode } from "@jam-overture/loom"
import { beforeAll, describe, expect, it } from "vitest"

import { MAINTAINERS_OWN, PACKAGES, RESERVED_VOCABULARY } from "./copy"
import { pageTreeFor, treeFor } from "./render"
import { SERVED_STATE_COUNT, servedPages, sweepCover, sweepShare, type ServedPage } from "./served"
import { DEFAULT_THEME, HOME, PAGES_AT_LEAST, SITE_PATHS, SITE_ROUTES, type SiteRoute } from "./site"
import { readerCopy, sentencesOf, uses, wordCountOf, wordsOf, type ReaderString } from "./words"

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
  withoutPackageNames(
    wordsOf((await pageTreeFor(route, { theme: DEFAULT_THEME })).root)
  )

/**
 * The one span of a served page that is not copy, taken out before the sweep.
 *
 * The front door prints an install command, and
 * `@jam-overture/loom-primitives` is a reserved word in the middle of a package
 * name. The sweep below reads text nodes — correctly, that is the lesson of
 * 24 August — so it read the command and reported the front door for saying
 * *primitives* to a stranger, which is a true reading of a false thing: nobody
 * reads a line they are going to paste, and the name is npm's rather than this
 * lane's to word.
 *
 * **Exactly the published names and nothing else**, longest first so that
 * `@jam-overture/loom` cannot eat the start of the longer one and leave
 * `-primitives` behind. A sentence that says *primitive* on its own is
 * untouched by this and still fails, which is the property that makes the
 * exemption safe to have: it cannot be widened by writing worse copy, only by
 * publishing another package.
 */
const withoutPackageNames = (text: string): string =>
  [...PACKAGES]
    .sort((left, right) => right.length - left.length)
    .reduce((stripped, name) => stripped.split(name).join(" "), text)

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

  const hero = find(treeFor(route, { theme: DEFAULT_THEME }).root)

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
   * a sentence has started carrying two, and the sentence this replaced carried
   * four clauses and forty-five words on the first screen of the site.
   *
   * ## It measured sentences that were not on the page
   *
   * This read `wordsOf(hero)` until 3 October, which is every string in the band
   * **joined with a space** and then split on terminal punctuation. A band is not
   * a paragraph: an eyebrow, a headline and two button labels have no full stops
   * at the end of them, because none of them is a sentence. So the splitter ran
   * them into whatever came next and measured the join.
   *
   * On the front door it was reading this as one sentence of thirty-three words:
   *
   * > *For pages that AI is allowed to change Make your web page dynamic with AI
   * > and Loom AI already writes the components, but would you trust AI to
   * > dynamically change your web page?*
   *
   * That is the eyebrow, the headline and the lead's opening clause, and the
   * longest real sentence in the band is sixteen words. It also read the two
   * actions as *"See how a change travels Try it yourself"*.
   *
   * **And it passed for seven weeks**, because the headline it was written
   * against ended in a full stop — which broke the blob in the one place that
   * made the arithmetic come out. The maintainer's headline of 3 October does
   * not end in one, as headlines generally do not, and the test reported a
   * thirty-three-word sentence nobody had written.
   *
   * So it measures each string the band carries on its own, which is what the
   * site-wide rule below has done since the day it was written. A headline is
   * one unit and the paragraph under it is another, and the only honest
   * alternative — punctuating a headline to satisfy a splitter — is a test
   * editing the page it is supposed to be reading.
   */
  it.each(SITE_ROUTES)("$path keeps its opening sentences short enough to follow", (route) => {
    const tooLong = readerCopy(heroOf(route)).flatMap(({ field, text }) =>
      sentencesOf(text)
        .filter((sentence) => wordCountOf(sentence) > 30)
        .map((sentence) => `${field} (${wordCountOf(sentence)}w): ${sentence}`)
    )

    expect({ route: route.path, tooLong }).toEqual({ route: route.path, tooLong: [] })
  })

  /** And it is reading something: every opening band has copy in it. */
  it.each(SITE_ROUTES)("$path has an opening band with words in it", (route) => {
    expect(readerCopy(heroOf(route)).length).toBeGreaterThanOrEqual(3)
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
 * destination in *attention* — *Takes one click*, *Takes an afternoon* —
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

/**
 * **Plain language, and it is the maintainer's instruction of 1 October made
 * into a test.**
 *
 * His words, about two sentences this lane had written:
 *
 * > *"Why do you write stuff so weirdly. No one talks like that. … Stop writing
 * > weird shit. It should sound like common language. Explain things if you
 * > have to."*
 *
 * He was right, and it was not two sentences. Measured across the page builders
 * the morning he said it, **a quarter to a half of every sentence over forty
 * characters carried an em dash** — because each run of this lane wrote in the
 * register of the run before it, and nothing anywhere said that was a register
 * rather than the house style.
 *
 * ## Why the em dash is the thing checked
 *
 * It is not punctuation snobbery. In this site's copy the em dash was doing one
 * job almost every time: joining a plain clause to a second clause that
 * qualified, inverted or dramatized it. *"Loom is wired to no vendor — point it
 * at the model you already use."* Take the dash away and the sentence has to
 * become two, and once it is two it has to be plain, because there is no pivot
 * left to hide the second thought behind.
 *
 * So the dash is a **proxy**, and a good one: it is unambiguous, it needs no
 * judgement, and removing it forces the rewrite that was actually wanted.
 *
 * ## It read six prop names, and the site's paragraphs are not props
 *
 * **Scoped to "the fields a reader scans" until today, which turned out to
 * mean six prop names on the page as it is *written*.** Both halves of that
 * were holes, and together they were most of the site:
 *
 * - **The site's prose is text nodes.** `loom.prose` carries its paragraph as a
 *   child, so a rule over `title`, `body`, `label`, `caption`, `value` and
 *   `eyebrow` cannot read one word of running copy. Of the 38 strings rewritten
 *   in the 1 October sweep, the great majority were prose, including every one
 *   of the four sentences the maintainer quoted back.
 * - **And it read `treeFor`.** The record panel on `/how-it-works` is built
 *   from the request a visitor made, so it exists only on the page as *served*:
 *   59 strings and 456 words, a third of that page, which no rule in this lane
 *   had ever read.
 *
 * Measured on the branch that fixed it, **twelve strings on this site carried
 * an em dash and these two rules saw none of them.** Seven of the twelve are
 * text nodes, which a list of six prop names cannot read. The other five are
 * props, and every one of those is on a page `treeFor` never builds.
 *
 * The length rule did no better: **ten scanned fields of 36 to 57 words, every
 * one of them a rung of the one band on this site that is a list of steps**,
 * and all ten invisible for the same second reason.
 *
 * `served.ts` is where the second half is fixed once rather than per
 * assertion, and it has the measurement.
 *
 * ## Two rules, because a writer controls one of them and not the other
 *
 * What the rules now read is **every string a reader reads, in every state the
 * site can be served in** — and they are two rules rather than one because the
 * copy underneath them is two kinds of thing.
 *
 * **A sentence is bounded everywhere.** Thirty words, which is the ceiling this
 * file has held every opening band to since it was written, now applied to the
 * whole site instead of the first screen. It is the maintainer's *one idea per
 * sentence* and it is the rule that works on generated copy, because a sentence
 * is a unit a template controls.
 *
 * **A scanned field is bounded where somebody wrote it**, which is the page as
 * published. A rung built from a record is as long as the change was: a request
 * at the refusal floor fires five of the rules and the record says all five.
 * Capping *that* at thirty-five words would mean either truncating a record —
 * the one thing a site selling the record may never do — or capping what a
 * visitor may ask for. So the 35-word ceiling stays on the written tree, where
 * a writer chose every word, and the served half is held to the sentence rule
 * instead. The punctuation is where that bites, and it is what the weighing
 * sentence in `adapt/record.ts` was changed for.
 *
 * **If either fails, the fix is a rewrite, not a comma.** A rule satisfied by
 * swapping punctuation has bought nothing.
 */

/** A reader string, and the page and state it was read off. */
type Read = ReaderString & { readonly route: string; readonly state: string }

const readOf = (pages: readonly ServedPage[]): readonly Read[] => {
  const seen = new Set<string>()

  return pages.flatMap(({ route, state, tree }) =>
    readerCopy(tree.root).flatMap((string) => {
      const key = `${route.path}|${string.field}|${string.text}`

      if (seen.has(key)) return []
      seen.add(key)

      return [{ ...string, route: route.path, state }]
    })
  )
}

const describeRead = ({ route, state, field, text }: Read): string =>
  `${route} (${state}) ${field}: ${text}`

/**
 * Whether this string is one of his, which is a match and not a search.
 *
 * Exactly equal after trimming, so a line of his edited into a longer sentence
 * is not exempted by containing his words. See `MAINTAINERS_OWN`.
 */
const isMaintainers = (text: string): boolean =>
  MAINTAINERS_OWN.some((line) => line.trim() === text.trim())

describe("every string a reader reads", () => {
  let read: readonly Read[] = []
  let pages: readonly ServedPage[] = []

  beforeAll(async () => {
    pages = await servedPages()
    read = readOf(pages)
  })

  /**
   * The sweep says how much it looked at, which is what makes the three
   * assertions below assertions.
   *
   * A test over an empty list passes, and this lane has filed that failure
   * once already — a test whose expected value came from the code under test,
   * 27 September. So the sweep is checked before anything is checked *about*
   * the strings, and in three independent ways: it covered every page of the
   * site, no state of any page came back quiet, and what one state carries is
   * above a floor.
   *
   * **None of the three moves when the sweep changes shape**, which is the
   * whole of what was wrong with the floor that stood here. It was
   * `3 * 2 * 21` — a hand copy of `served.ts`' own dimensions — and it went red
   * on 21 October for a change that touched no copy at all, because the
   * deployment stopped being one of those dimensions. `sweepShare` has the
   * reasoning.
   */
  it("looked at every page of this site, in every state, and none of them came back quiet", () => {
    /**
     * The sweep reached every page, which is the half a per-state floor cannot
     * see: a sweep that stopped building one route of three keeps two thirds of
     * its average and is still broken.
     *
     * The walk this file wrote by hand is `sweepCover` as of 23 October, which
     * has the measurement of what the one-line version let through. The floor
     * is `PAGES_AT_LEAST` and is still the only number in the pair that nothing
     * computes.
     */
    const cover = sweepCover(pages)

    expect(cover).toEqual({ states: SERVED_STATE_COUNT, routes: SITE_PATHS })
    expect(cover.routes.length).toBeGreaterThanOrEqual(PAGES_AT_LEAST)

    /**
     * 97 strings a state on 22 October, the smallest state carrying 54 — so a
     * floor of 30 is well under the page this site is thinnest in, and a state
     * that reads nothing at all is caught by `quiet` rather than by this.
     */
    const share = sweepShare(pages, (page) => readerCopy(page.tree.root).length)

    expect(share.quiet).toEqual([])
    expect(share.each).toBeGreaterThanOrEqual(30)

    /**
     * `read` is the strings de-duplicated across the states of a route, so this
     * one is already independent of how many states there are: it did not move
     * on 21 October and it would not move if the sweep were crossed again. It
     * is the count the three rules below actually run over, which is why it is
     * floored separately from the per-state reading above.
     */
    expect(read.length).toBeGreaterThanOrEqual(200)
  })

  
  it("says it without reaching for an em dash", () => {
    const offenders = read
      .filter(({ text }) => text.includes("—") && !isMaintainers(text))
      .map(describeRead)

    expect(offenders).toEqual([])
  })

  /**
   * Thirty words, the number this file has held an opening band to since it was
   * written, now over the whole site. One idea per sentence.
   */
  it("keeps every sentence to one idea", () => {
    const offenders = read.flatMap((string) =>
      isMaintainers(string.text)
        ? []
        : sentencesOf(string.text)
            .filter((sentence) => wordCountOf(sentence) > 30)
            .map((sentence) => `${describeRead(string)} → (${wordCountOf(sentence)}w) ${sentence}`)
    )

    expect(offenders).toEqual([])
  })

  /**
   * The list of his lines, held from the other end.
   *
   * An exemption that outlives the thing it exempts is the shape this lane
   * filed on 26 September — a comment stating a library limit outlived the
   * limit by a fortnight. So a line sitting in `MAINTAINERS_OWN` has to still
   * be on the page: rewrite or delete one and this says so, rather than the
   * list going on exempting nothing.
   */
  it.each(MAINTAINERS_OWN)("still renders the maintainer's own line: %s", (line) => {
    expect(read.some(({ text }) => text.trim() === line.trim())).toBe(true)
  })
})

/**
 * The 35-word ceiling, on the fields a reader **scans** and on the page as
 * **published** — which is to say, on the copy somebody chose every word of.
 *
 * A step, a card, a stat, a tile: those are a glance each, and a field doing
 * two jobs in a glance is a field nobody finishes. See the note above for why
 * this one did not follow the other two onto the served page.
 */
const SCANNED_PROPS: readonly string[] = ["title", "body", "label", "caption", "value", "eyebrow"]

const scannedCopyOf = (route: SiteRoute): readonly ReaderString[] =>
  readerCopy(treeFor(route, { theme: DEFAULT_THEME }).root).filter(
    ({ field }) => SCANNED_PROPS.includes(field.split(".").slice(-1)[0] ?? "")
  )

/**
 * A headline, which is the field this site's worst habit lives in.
 *
 * `loom.heading` carries its words as a text node and the cell primitives carry
 * theirs as a `title` prop, so the two spellings are both here. Nothing else
 * counts: the rule below is deliberately not about every sentence, and
 * **the boundary was measured rather than chosen.**
 */
const isHeadline = (field: string): boolean =>
  field === "loom.heading#text" || field.endsWith(".title")

const headlinesOf = (route: SiteRoute): readonly ReaderString[] =>
  readerCopy(treeFor(route, { theme: DEFAULT_THEME }).root).filter(({ field }) =>
    isHeadline(field)
  )

/**
 * **No headline ends in a comma and then a clause**, which is the maintainer's
 * ruling of 24 October made checkable.
 *
 * The sentence that caused it, and his words for it:
 *
 * > *"Stop saying stuff like this "You decide what may change, before anyone
 * > asks"… it's not that what you are saying is incorrect, it's that no one
 * > talks like that. It is obvious AI written crap and is not allowed."*
 *
 * The tell is a trailing clause that carries no fact. It is there for rhythm,
 * and read aloud it sounds like an advertisement rather than an explanation. It
 * is the mirror of the habit `docs/routines.md` already bans — *no sentence
 * opening on a negation to set up a reveal* — and it arrived on this site the
 * same way that one did: nobody chose it, each run wrote in the register of the
 * run before it.
 *
 * ## Why headlines and not every sentence
 *
 * Measured before the rule was written, over the three pages as authored: a
 * check for *any* sentence ending in a short comma clause flags **34 strings**,
 * and among them are
 *
 * > *"Pick the model you already use, or bring your own."*
 * > *"Anything else gets rejected, and Loom tells you why."*
 *
 * which are the maintainer's own register, built on his own line of 1 October.
 * A rule that bans those is a rule that bans the thing the site is trying to
 * sound like. **In a sentence the second clause usually carries a fact; in a
 * headline it is almost always a flourish**, and the same sweep over headlines
 * alone caught **9 of 49, every one of them this lane's and none of them his.**
 *
 * So the rule is narrow on purpose, and the ones it cannot see are left to
 * `docs/positioning.md`' table and to whoever is reading the draft.
 *
 * **If this fails, the fix is a rewrite and not a comma** — `routines.md` says
 * it of the em-dash rule and it is truer here, because the flourish survives
 * losing its punctuation and a headline that drops the comma has bought
 * nothing.
 */
describe("a headline on this site", () => {
  it.each(SITE_ROUTES)("$path ends none of them on a flourish", (route) => {
    const trailing = headlinesOf(route)
      .filter(({ text }) => /,[^,]*$/.test(text.trim()))
      .map(({ field, text }) => `${field}: ${text}`)

    expect({ route: route.path, trailing }).toEqual({ route: route.path, trailing: [] })
  })

  /** And it read some: a page with no headline passes the rule over nothing. */
  it.each(SITE_ROUTES)("$path has headlines for the rule to read", (route) => {
    expect(headlinesOf(route).length).toBeGreaterThanOrEqual(4)
  })
})

describe("the copy a reader scans rather than reads", () => {
  it.each(SITE_ROUTES)("$path keeps a scanned field to something scannable", (route) => {
    const tooLong = scannedCopyOf(route)
      .filter(({ text }) => wordCountOf(text) > 35)
      .map(({ field, text }) => `${field} (${wordCountOf(text)} words): ${text}`)

    expect({ route: route.path, tooLong }).toEqual({ route: route.path, tooLong: [] })
  })

  /** And the sweep is not empty: every page has scanned copy on it. */
  it.each(SITE_ROUTES)("$path has scanned copy to check", (route) => {
    expect(scannedCopyOf(route).length).toBeGreaterThanOrEqual(8)
  })
})
