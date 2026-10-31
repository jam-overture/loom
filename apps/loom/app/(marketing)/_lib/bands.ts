/**
 * What each band of the front door is called.
 *
 * The eyebrow is the one label a band carries that is stable, visible and
 * unique — every band on the landing page is a `loom.section`, so "the section"
 * is not something a caller can name. Two readers need to agree on it and they
 * are in different files: the page builder writes it, and a change the visitor
 * asks for has to *find* the band it is about to move or remove.
 *
 * Kept here rather than in either of them because a literal spelled in both
 * places is a literal that gets re-worded in one of them, and the failure that
 * follows is silent: the plan finds nothing, returns nothing, and the choice
 * quietly stops being offered. `asks.test.ts` holds every choice against the
 * real page for that reason.
 */
export const BAND = {
  /**
   * The chain, and it is the first band under the hero as of 25 October.
   *
   * *Start to finish* rather than a count, for the reason `chain.ts` gives at
   * length: this page already says *four steps* one band further down and
   * `/how-it-works` says *five*, and a third number on the front door would
   * undo the one thing `journey.ts` was written to fix.
   */
  chain: "Start to finish",
  whatIsIt: "What is Loom?",
  seeItHappen: "See it happen",
  usingIt: "Using it",
  problems: "What this is for",
  facts: "Where it is today",
  asData: "How this page is put together",
  questions: "Questions",
  install: "Install it",
  /**
   * What it costs, and it is the first band on this site to say anything about
   * money.
   *
   * It sits directly under `install` because the question it answers is the one
   * a reader has the moment they are shown a command to run. `costs.ts` has the
   * whole of what it may claim and where that permission comes from.
   */
  costs: "What it costs",
  waysIn: "Keep going",
} as const


/**
 * The bands of `/how-it-works`, by the eyebrow each one carries.
 *
 * Separate from `BAND` because that map is the front door's. These exist for
 * one reason: **the five choices moved to this page on 1 October**, at the
 * maintainer's instruction, and a choice has to find the band it is about.
 * `asks.ts` reads these; `how-it-works.ts` writes them onto the sections.
 *
 * Spelled here rather than in the page builder so that the page and the
 * requests made against it cannot drift apart silently. A choice whose band has
 * been renamed finds nothing, returns nothing, and stops being offered without
 * anything turning red, which is the failure `asks.test.ts` exists to catch.
 */
export const MECHANISM_BAND = {
  journey: "End to end",
  rules: "Your rules",
  record: "The record",
  refusal: "When the answer is no",
  puttingItBack: "Putting it back",
  whoAsks: "Who is asking",
  goingDeeper: "Going deeper",
} as const

export type MechanismBandName = keyof typeof MECHANISM_BAND

/** The four short answers, which the shortest of the five choices takes away together. */
export const MECHANISM_SHORT_ANSWERS: readonly string[] = [
  MECHANISM_BAND.rules,
  MECHANISM_BAND.record,
  MECHANISM_BAND.refusal,
  MECHANISM_BAND.puttingItBack,
]

export type BandName = keyof typeof BAND

/**
 * The address of a band, for a link that stays on the page.
 *
 * `BAND` is what a band is *called*; this is where a link lands. The two are
 * separate for one reason: **a fragment is an address**. Somebody may have
 * shared `/?ask=shorter#see-it-happen`, and a band renamed in the copy should
 * not silently retire a link a visitor is holding. Deriving the slug from the
 * eyebrow would make the two agree by construction and would make every copy
 * edit a quiet redirect to nowhere, which is the more expensive of the two
 * failures.
 *
 * So they are declared, and `anchors.test.ts` holds the part that matters:
 * every anchor here is on the page in every state the page can be in, is
 * spelled the way the library requires, and is unique in the tree. A link
 * pointing at a band that has since been renamed is a control that silently
 * does nothing, and nothing else on the page would say so.
 *
 * Only the bands something points at are listed. An anchor nobody links to is
 * an `id` on an element for its own sake.
 */
export const ANCHOR = {
  seeItHappen: "see-it-happen",
} as const satisfies Partial<Record<BandName, string>>

/**
 * The one anchor that is not a band of the front door.
 *
 * `/what-you-run` says what this deployment counts about a reader, and the
 * footer of every page links to it — which it did by naming a page until
 * 26 September, when that page was retired into a band. A band is reachable
 * only by its anchor, so this is the link that used to be a route.
 *
 * It is separate from `ANCHOR` rather than a sixth entry because that map is
 * keyed by `BandName`, and `BandName` is the front door's bands. Widening it to
 * hold a second page's would make the key mean two things.
 */
export const COUNTED_ANCHOR = "what-we-count"

/**
 * The bands of `/why-use-it` that the chain points at.
 *
 * **The chain is the site's map as of today**, and that is what these exist
 * for. `docs/positioning.md` records the maintainer's six links and calls them
 * *the message*; `chain.ts` holds them as data and `shownAt` says, for each
 * one, where on this site a visitor can go and watch it being true. Three of
 * the six land here, on three different bands of one page, so three of its
 * bands need an address a link can carry.
 *
 * Three constants rather than entries in `ANCHOR` for the reason
 * `COUNTED_ANCHOR` gives above and in the same words: that map is keyed by
 * `BandName` and `BandName` is the front door's bands. Grouped rather than
 * loose because they belong to one page and are read together — a later run
 * looking for *what can be linked to on `/why-use-it`* gets one answer instead
 * of grepping for a spelling.
 *
 * `chain.test.ts` holds each of them to the half a press depends on: the band
 * still declares it, read off the markup a browser receives rather than off
 * the tree. An anchor a band stopped declaring is a link that scrolls nowhere
 * on a page that renders perfectly, which is the failure `anchors.test.ts` was
 * written about and the one nothing else reports.
 */
export const WHY_USE_IT_ANCHOR = {
  /** *You still write your components and choose your model.* */
  staysYours: "what-stays-yours",
  /** The name of every part in the starter set. */
  theSet: "what-you-build-with",
  /** A browser, with a page built out of that set inside it. */
  onAPage: "on-a-page",
  /**
   * The same page arranged for a reader it was not built for, wiped by a
   * handle. It is the band that earns the site's headline, so it is the one an
   * outside link is most likely to want.
   */
  forAReader: "for-a-reader",
} as const
