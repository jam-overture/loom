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
 * The band that says what allowed a change, which is the one anchor on this
 * site that nothing links to.
 *
 * **Declared anyway, and the reason is the opposite of the usual one.** Every
 * other anchor here exists because a control points at it;
 * `anchors.test.ts` is written about the press that lands nowhere. This band
 * is the last one before the closing band of `/why-use-it`, six thousand
 * pixels down a page, and the chain's fifth rung already has its destination
 * one band above it — so there is no press to serve and there is not going to
 * be one until somebody decides this band is worth a rung of its own.
 *
 * What an anchor buys instead is that the band is **addressable**: a report
 * can send the maintainer to it, a pull request comment can, and
 * `pnpm shoot` can photograph it by name rather than by a selector guessed off
 * the markup. A band this site cannot link to is a band nobody can be asked to
 * look at, and this is the surface the maintainer judges by eye.
 *
 * Its own constant rather than an entry in `WHY_USE_IT_ANCHOR` below, because
 * that map says what it is for in its first line — *the bands of `/why-use-it`
 * that the chain points at* — and this is not one. Same reasoning as
 * `COUNTED_ANCHOR` above, one layer in: a key that means two things is a key a
 * later run reads wrongly.
 */
export const ALLOWED_ANCHOR = "what-allowed-it"

/**
 * The band that says the sections come assembled, which is the second anchor
 * on this site nothing links to.
 *
 * Declared for the reason `ALLOWED_ANCHOR` above gives in full, and the reason
 * holds without a change of a word: an anchor buys **addressability**, so a
 * report can send the maintainer to the band, a pull request comment can, and
 * `pnpm shoot` can photograph it by name rather than by a selector guessed off
 * the markup. This is the surface judged by eye and this band is the one a run
 * will most want photographed on its own.
 *
 * It is not in `WHY_USE_IT_ANCHOR` below for the same reason that map excludes
 * the two above it: its first line says what it is for — the bands of
 * `/why-use-it` that the chain points at — and the chain has six links, none
 * of which is this. `ready.ts` has the band.
 */
export const READY_MADE_ANCHOR = "ready-made"

/**
 * The band that shows the route a reader puts a Loom page on, which is the
 * third anchor on this site nothing links to.
 *
 * Declared for the reason `ALLOWED_ANCHOR` and `READY_MADE_ANCHOR` above both
 * give: an anchor buys **addressability**, and this is the surface the
 * maintainer judges by eye. A band whose whole content is a panel of code is
 * the one a report most wants photographed on its own and the one a pull
 * request comment most wants to send him straight to.
 *
 * It is not in `WHY_USE_IT_ANCHOR` below for the same reason those two are not:
 * that map is the bands of `/why-use-it` **the chain points at**, and the chain
 * has six links, none of which is this. `wired.ts` has the band's panel.
 */
export const ON_YOUR_SITE_ANCHOR = "on-your-own-site"

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
  /**
   * The two files a reader writes to add a component of their own.
   *
   * The second link of the maintainer's chain is *you tell Loom which ones it
   * can use*, and it pointed at `theSet` above until today — a row of badges
   * naming the parts that come with the install, which is the answer to a
   * different question. This band is the one that shows the telling.
   */
  whatYouWrite: "what-you-write",
  /** A browser, with a page built out of that set inside it. */
  onAPage: "on-a-page",
  /**
   * One report from the page above, as the server receives it.
   *
   * The fourth link of the maintainer's chain is *your page reports what
   * readers do with it*, and it landed on the disclosure band of
   * `/what-you-run` until today — which says what *this* deployment counts
   * about the person reading, and is the right band for that question and the
   * wrong one for a developer asking what they get. `reported.ts` carries the
   * argument.
   */
  whatItReports: "what-your-page-reports",
  /**
   * The same page arranged for a reader it was not built for, wiped by a
   * handle. It is the band that earns the site's headline, so it is the one an
   * outside link is most likely to want.
   */
  forAReader: "for-a-reader",
  /**
   * The one function a reader writes to connect a model of their own.
   *
   * It is not one of the chain's six, so it is in this map rather than beside
   * it for a different reason: the front door's four steps now carry an `href`
   * each, and this is the one of the four that had nowhere to point.
   * `connected.ts` has why the band exists and `using-it.test.ts` holds every
   * step to landing on a band that declares its anchor.
   */
  connected: "hook-up-your-model",
} as const
