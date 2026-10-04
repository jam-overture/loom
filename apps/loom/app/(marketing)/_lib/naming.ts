import type { LoomNode } from "@jam-overture/loom"

import { elementsIn } from "./measure"
import { DEMO, DOCS, HOME, HOW_IT_WORKS, LESSONS, PORTAL, WHAT_YOU_RUN } from "./site"
import { wordCountOf, type ReaderString } from "./words"

/**
 * What this site says about its own pages, and whether it is still true.
 *
 * A sentence that names a page is making a claim about where something lives,
 * and it is the one kind of claim on this site that can go stale without
 * anybody touching the sentence. On 30 September a band moved from the front
 * door to `/how-it-works`. Its own tests moved with it and everything stayed
 * green. A paragraph on a third page still read *"the ready-made changes on the
 * front door do not send anything at all"*, and a reader following it landed on
 * a page with no such thing on it. Nothing in this repository connected those
 * two facts, and the sentence was wrong for a day.
 *
 * The register rules in `voice.test.ts` could not have caught it: the sentence
 * is plain, short and well written. It is simply about somewhere else.
 *
 * ## The three rules, and why they are three
 *
 * **A page this site names is a page this site has.** The shape *the Something
 * page* is a proper name, and a proper name that resolves to nothing is a page
 * that has been retired out from under a sentence.
 *
 * **A band that names a page in a sentence offers the way there.** This is the
 * half that is about the reader rather than about us. A paragraph that sends
 * somebody to another page and makes them find it is a paragraph that wastes
 * the one moment they were willing to go.
 *
 * **A link from one page of this site to a place on another lands on
 * something.** `anchors.test.ts` holds that rule *within* `/how-it-works` and
 * stops at the page boundary on purpose, because a fragment on `/docs` is the
 * documentation lane's promise rather than this one's. A fragment on
 * `/what-you-run` is this lane's promise, and nothing held it — two such links
 * were live on the site when this was written. That is the gap the first
 * paragraph describes, stated as something a test can read: the sentence does
 * not have to name the band, as long as the link beside it points at it.
 *
 * Together they are one property. **If the thing a sentence points at moves,
 * the link into it breaks, and the build says so.**
 */

/** A page of the product, and the words this site's copy uses to mean it. */
export type PageName = {
  readonly path: string
  /**
   * How a reader meets it, in the copy rather than in the code.
   *
   * A site route's own label is its name and is written the way a name is
   * written, so it is matched **with its capitals**. A surface is more often
   * referred to than named — *the documentation*, *the demo* — and those are
   * ordinary words that start a sentence as often as not, so they are matched
   * without.
   *
   * That split is not tidiness. Lower-casing *How it works* would make this
   * fire on every sentence explaining how something works, and upper-casing
   * *The documentation* would miss it at the start of the only sentence on the
   * site that says it.
   */
  readonly phrases: readonly string[]
  /** Whether the phrases are a name (matched as written) or ordinary words. */
  readonly asWritten: boolean
}

/**
 * Every destination, and what this site calls it.
 *
 * Held against `SITE_ROUTES` and `PRODUCT_SURFACES` by the test, so a page
 * added to either list arrives here before it can be named in prose.
 *
 * **The portal is deliberately nameless, and it is the interesting entry.**
 * *Portal* is a common noun on this site before it is a page: the front door's
 * answer to *is this a service?* is that **every** Loom site has a portal of
 * its own, and the FAQ says so in four sentences that are about the reader's
 * deployment rather than about ours. A rule that read *the portal* as a mention
 * of `/portal` would fire on all of them and be wrong every time. The way into
 * this site's own portal is the **Sign in** control, which is not a page name
 * at all, and `chrome.test.ts` already holds it on every page.
 */
export const PAGE_NAMES: readonly PageName[] = [
  {
    path: HOME.path,
    /**
     * Three ways of saying the one page that has no name in the bar.
     *
     * The front door is `inMenu: false` and its label is *Home*, which is a
     * word no sentence on this site uses, so the phrases are the ones prose
     * actually reaches for. *The front door* is the house phrase, and it is
     * also the phrase the stale sentence of 30 September used.
     */
    phrases: ["the front door", "the home page", "the landing page"],
    asWritten: false,
  },
  { path: HOW_IT_WORKS.path, phrases: [HOW_IT_WORKS.label], asWritten: true },
  { path: WHAT_YOU_RUN.path, phrases: [WHAT_YOU_RUN.label], asWritten: true },
  { path: DEMO.path, phrases: ["the demo", "the demonstration"], asWritten: false },
  { path: DOCS.path, phrases: ["the docs", "the documentation"], asWritten: false },
  { path: LESSONS.path, phrases: ["the course"], asWritten: false },
  { path: PORTAL.path, phrases: [], asWritten: false },
]

const escaped = (phrase: string): string => phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/**
 * The phrase, and nothing it is a part of.
 *
 * `\b` is the wrong boundary here: it would let *the docs* match inside
 * *the docs-first approach*, because a hyphen is a word boundary to a regular
 * expression and is not one to a reader. So the boundary is *not a word
 * character and not a hyphen*, on both ends.
 */
const boundedBy = (phrase: string, asWritten: boolean): RegExp =>
  new RegExp(`(?<![\\w-])${escaped(phrase)}(?![\\w-])`, asWritten ? "g" : "gi")

/** One place this site names one of its own pages. */
export type Mention = {
  /** The page being named. */
  readonly names: string
  /** The phrase that named it, as it is written on the page. */
  readonly phrase: string
  readonly field: string
  readonly text: string
  /**
   * Whether it is said *about* the page rather than standing there as the way
   * to it.
   *
   * A menu item, a card heading and a pager each carry a page's name and
   * nothing else: they are the way there, and the name is the label on the
   * door. A sentence that carries the name among two dozen other words is
   * making a claim, and it is claims that go stale.
   *
   * The line between them is drawn by length rather than by field, because
   * both shapes occur in both places. *Read the docs* is a heading on the front
   * door and an action on two other pages; the one claim about the
   * documentation on this site is a `loom.prose` text node. One word of slack
   * is allowed so that *the How it works page* and *Read the docs* stay on the
   * navigation side of it.
   */
  readonly inASentence: boolean
}

const mentionsInString = ({ field, text }: ReaderString): readonly Mention[] =>
  PAGE_NAMES.flatMap((page) =>
    page.phrases.flatMap((phrase) =>
      [...text.matchAll(boundedBy(phrase, page.asWritten))].map(
        (match): Mention => ({
          names: page.path,
          phrase: match[0],
          field,
          text,
          inASentence: wordCountOf(text) - wordCountOf(phrase) > 1,
        })
      )
    )
  )

/** Every page this site names, in a band or anywhere else a walk reaches. */
export const mentionsIn = (strings: readonly ReaderString[]): readonly Mention[] =>
  strings.flatMap(mentionsInString)

/**
 * A proper name standing in front of the word *page*, whoever it belongs to.
 *
 * This is the half that finds a page nothing here knows about, so it cannot be
 * driven off `PAGE_NAMES` — a sentence naming a page that was retired is
 * exactly a sentence whose page name is not in that list any more.
 *
 * The capital is what makes it a name. *this page*, *your page* and *a page of
 * yours* are the same four letters doing ordinary work and there are dozens of
 * them on the site. Two trailing lower-case words are allowed so that
 * *the How it works page* is read whole; a third would start matching
 * *the AI write code into my page*, which is a question on the front door and
 * is not naming anything.
 */
const NAMED_PAGE = /(?<![\w-])the ((?:[A-Z][A-Za-z']*)(?:[ ][a-z']+){0,2})[ ]page(?![\w-])/g

/** The page names a string claims, by the shape above rather than by the list. */
export const namedPagesIn = (text: string): readonly string[] =>
  [...text.matchAll(NAMED_PAGE)].flatMap((match) => (match[1] === undefined ? [] : [match[1]]))

/**
 * The page a bare name means, or nothing when this site has no such page.
 *
 * What `namedPagesIn` captures is the name without its article, because the
 * shape it reads spends the article itself: *the How it works page* gives back
 * *How it works*. So the article is taken off this side too rather than being
 * guessed at on the other.
 */
export const pathNamed = (name: string): string | undefined =>
  PAGE_NAMES.find((page) =>
    page.phrases.some((phrase) => {
      const bare = phrase.replace(/^the /i, "")

      return page.asWritten ? bare === name : bare.toLowerCase() === name.toLowerCase()
    })
  )?.path

const asUrl = (href: string, origin: string): URL | undefined => {
  try {
    return new URL(href, `${origin}/`)
  } catch {
    return undefined
  }
}

/** Every page of this product a node offers a way to, by path. */
export const pathsLinkedFrom = (node: LoomNode, origin: string): ReadonlySet<string> =>
  new Set(
    elementsIn(node).flatMap((element) => {
      const href = element.props["href"]

      if (typeof href !== "string") return []

      const url = asUrl(href, origin)

      return url === undefined || url.origin !== origin ? [] : [url.pathname]
    })
  )

/** A link from one page of this site to a named place on another one. */
export type CrossPageLink = {
  readonly to: string
  readonly fragment: string
}

/**
 * The links `anchors.test.ts` stops short of, and only those.
 *
 * Same-page fragments are that file's and are left to it. A link leaving for
 * another product surface is left alone for the reason it records: the anchor
 * is on somebody else's page and asserting it would be this lane testing
 * another lane's chrome. What is left is the set in between — this route
 * group's own pages pointing into each other — and it is nobody's but this
 * lane's.
 */
export const crossPageFragmentsIn = (
  node: LoomNode,
  from: string,
  origin: string,
  routes: readonly string[]
): readonly CrossPageLink[] =>
  elementsIn(node).flatMap((element) => {
    const href = element.props["href"]

    if (typeof href !== "string") return []

    const url = asUrl(href, origin)

    if (url === undefined || url.origin !== origin) return []
    if (url.hash === "" || url.pathname === from) return []
    if (!routes.includes(url.pathname)) return []

    return [{ to: url.pathname, fragment: url.hash.slice(1) }]
  })

/** Every anchor a tree declares, which is every place a fragment can land. */
export const anchorsIn = (node: LoomNode): readonly string[] =>
  elementsIn(node).flatMap((element) =>
    typeof element.props["anchor"] === "string" ? [element.props["anchor"]] : []
  )
