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
}

export const CHAIN: readonly ChainLink[] = [
  {
    link: "React/TypeScript components",
    actor: "You",
    title: "You build your components in React",
    body: "React, TypeScript, and the components you have already written. Loom does not write code into them and it does not ask you to rebuild anything.",
  },
  {
    link: "Loom framework / Primitives",
    actor: "You",
    title: "You tell Loom which ones it can use",
    body: "Loom keeps a list of the components an AI model is allowed to use, and what each one needs. That list is the whole of the setup.",
  },
  {
    link: "Loom designed web page",
    actor: "Loom",
    title: "Loom builds your page out of them",
    body: "Your page is put together from your own components. Nothing a visitor sees is markup that Loom wrote.",
  },
  {
    link: "Signals broadcasting to your AI model",
    actor: "Your page",
    title: "Your page reports what readers do with it",
    body: "Which parts they reach, how long they stay, and what they press. Your page never reports who they are.",
  },
  {
    link: "AI reacting to signals and redesigning page",
    actor: "Your AI model",
    title: "Your AI model rearranges it to suit them",
    body: "It reads what your page saw and proposes a different arrangement. Loom checks that against your rules before anything moves.",
  },
  {
    link: "Greater user engagement and conversion",
    actor: "Your readers",
    title: "Greater user engagement and conversion",
    body: "This is what the rest of it is for. Loom and your AI model keep working on your page after you have stopped.",
  },
]

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
