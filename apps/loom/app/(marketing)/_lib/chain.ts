/**
 * The chain, which is the spine of the site.
 *
 * `docs/positioning.md` records it in the maintainer's own words, written on
 * 24 October, and calls it *the message*:
 *
 * > React/TypeScript components > Loom framework / Primitives > Loom designed
 * > web page > Signals broadcasting to your AI model > AI reacting to signals
 * > and redesigning page > Greater user engagement and conversion
 *
 * > *"A page that explains those six in order, in words a junior developer
 * > reads once, is the site."*
 *
 * So the six are **data rather than a band written once**, and each one carries
 * two things: his wording of the link, kept exactly as he wrote it, and this
 * lane's plain rendering of it. `chain.test.ts` holds the band to one entry per
 * link, in his order, which is the part that cannot be checked by reading the
 * page.
 *
 * ## His wording is not on the page, deliberately
 *
 * `link` is provenance and not copy. Two of the six are unpublishable as they
 * stand: *Loom framework / Primitives* uses a word `copy.ts`' reserved
 * vocabulary keeps off this site, and *AI reacting to signals and redesigning
 * page* is a note to himself rather than a sentence for a stranger. Keeping his
 * words beside ours means a later run can see what was being rendered and
 * check whether the rendering still says it.
 *
 * The one exception is the last link. *Greater user engagement and conversion*
 * is the only outcome this site is allowed to promise and it is his phrasing,
 * so it is published verbatim and sits in `MAINTAINERS_OWN` with his other
 * lines. `rendersLinkVerbatim` says which, so nothing has to guess.
 *
 * ## Why these are not numbered, and must not be
 *
 * The front door already counts two things and `/how-it-works` counts a third:
 * *Four steps* in the band about what you do, and *five steps* in the journey a
 * single change takes. `journey.ts` has the whole of why those two are
 * different and why conflating them is the cheapest way to lose somebody on the
 * first screen.
 *
 * A third number on the same page would undo that, so the chain is not a count
 * and no sentence on this site says how long it is. What the marker column
 * carries instead is **who does each thing**, which is the more useful fact
 * anyway: the first two are yours and the rest happen without you.
 */

import { COUNTED_ANCHOR, WHY_USE_IT_ANCHOR } from "./bands"
import { sitePath, WHAT_YOU_RUN, WHY_USE_IT } from "./site"

/** One link of the chain: his wording, and what a reader actually meets. */
export type ChainLink = {
  /**
   * The link as the maintainer wrote it, verbatim, and never edited.
   *
   * It is the authority for the entry rather than a label for it. Where this
   * and `title` disagree about what the link means, this one is right and the
   * rendering is wrong.
   */
  readonly link: string
  /** Who does this one. The marker column, and the two-and-four split. */
  readonly actor: string
  /** The heading a reader sees. A sentence about them, not one of our nouns. */
  readonly title: string
  /** What it means, for somebody who has never heard of any of this. */
  readonly body: string
  /**
   * The band of this site where a visitor can watch this link being true, or
   * nothing where this site has no such band.
   *
   * **This is what makes the chain the map rather than a summary.** It is the
   * first thing under the hero, it is the maintainer's own six links in his own
   * order, and until today every one of them was a dead end: a visitor read
   * six claims and was given no reason to believe any of them and nowhere to
   * go. Five of the six are already demonstrated somewhere on this site, each
   * on a page that was built for a different reason, and a stranger had no way
   * to find out.
   *
   * It is a band and not a page on purpose. Pointing the fourth link at
   * `/what-you-run` lands a reader at the top of a page about installation and
   * asks them to go looking; pointing it at the band that counts them lands
   * them on the sentence the link just made. The press is the argument, and a
   * press that arrives three screens above the argument has lost it. That is
   * `reaching.test.ts`' finding of 25 October, which measured the same mistake
   * at 3,622px on a phone, applied to the other five.
   */
  readonly shown?: Shown
}

/** A band of this site, named by the page that serves it and its own anchor. */
export type Shown = {
  /** The route, so a test can ask the application whether it still serves it. */
  readonly path: string
  /** The band's `id`, so the press lands on the band and not on the page. */
  readonly anchor: string
}

export const CHAIN: readonly ChainLink[] = [
  {
    link: "React/TypeScript components",
    actor: "You",
    title: "You build your components in React",
    body: "React, TypeScript, and the components you have already written. Loom does not write code into them and it does not ask you to rebuild anything.",
    shown: { path: WHY_USE_IT.path, anchor: WHY_USE_IT_ANCHOR.staysYours },
  },
  {
    link: "Loom framework / Primitives",
    actor: "You",
    title: "You tell Loom which ones it can use",
    body: "Loom keeps a list of the components an AI model is allowed to use, and what each one needs. That list is the whole of the setup.",
    shown: { path: WHY_USE_IT.path, anchor: WHY_USE_IT_ANCHOR.theSet },
  },
  {
    link: "Loom designed web page",
    actor: "Loom",
    title: "Loom builds your page out of them",
    body: "Your page is put together from your own components. Nothing a visitor sees is markup that Loom wrote.",
    shown: { path: WHY_USE_IT.path, anchor: WHY_USE_IT_ANCHOR.onAPage },
  },
  {
    link: "Signals broadcasting to your AI model",
    actor: "Your page",
    title: "Your page reports what readers do with it",
    body: "Which parts they reach, how long they stay, and what they press. Your page never reports who they are.",
    shown: { path: WHAT_YOU_RUN.path, anchor: COUNTED_ANCHOR },
  },
  {
    link: "AI reacting to signals and redesigning page",
    actor: "Your AI model",
    title: "Your AI model rearranges it to suit them",
    body: "It reads what your page saw and proposes a different arrangement. Loom checks that against your rules before anything moves.",
    /**
     * **It pointed at the demonstration until 31 October**, and
     * [0328](../../../../../decisions/0328-the-marketing-site-has-no-demonstration-and-no-mechanism-page.md)
     * removed it. This is the band that replaces it and it is a better answer
     * to this rung than the one it replaces: the demonstration rearranged
     * *this* site, which a stranger has never seen before and so cannot tell
     * has changed. *The same page arranged for someone else* rearranges a page
     * they were shown one band earlier.
     */
    shown: { path: WHY_USE_IT.path, anchor: WHY_USE_IT_ANCHOR.forAReader },
  },
  /**
   * **The one rung this site cannot show, and it is the last one.**
   *
   * Every other link lands on a band where a visitor can watch it happen. This
   * one happens on *their* page, months after they install anything, and the
   * only honest destination for it would be a claim about somebody else's
   * numbers. `chain.test.ts` holds it unlinked and holds it to being the
   * **last** rung, so that the shape of the band says something true: the work
   * stops at the second link, the showing stops at the fifth, and what is left
   * is the reason for the other five.
   *
   * A later run with a case study in hand is the one that changes this, and
   * whether this site may make that claim at all is the maintainer's.
   */
  {
    link: "Greater user engagement and conversion",
    actor: "Your readers",
    title: "Greater user engagement and conversion",
    body: "This is what the rest of it is for. Loom and your AI model keep working on your page after you have stopped.",
  },
]

/**
 * Where a visitor presses to see a link being true, or nothing.
 *
 * The href is built here rather than stored in `CHAIN` so that the data stays
 * a pair of readable names — a route and a band — and the one spelling of
 * *this site's own address* stays `sitePath`'s. A stored href would also be
 * the wrong thing to store: these pages are stored trees as of 12 October
 * ([0259](../../../../../decisions/0259-a-surface-the-portal-governs-renders-from-the-store-and-a-page-built-at-render-time-is-not-one.md)),
 * so an absolute URL would freeze whichever preview deployment happened to
 * seed it.
 */
export const shownAt = ({ shown }: ChainLink): string | undefined =>
  shown === undefined ? undefined : `${sitePath(shown.path)}#${shown.anchor}`

/**
 * Whether a link is published in his words rather than in ours.
 *
 * One of the six is, and it is the outcome claim. A test reads this rather than
 * comparing the two fields, so the one exception is a stated property instead
 * of an accident that happens to hold today.
 */
export const rendersLinkVerbatim = ({ link, title }: ChainLink): boolean => link === title

/** The links alone, for anything that needs his order and not the rendering. */
export const CHAIN_LINKS: readonly string[] = CHAIN.map(({ link }) => link)
