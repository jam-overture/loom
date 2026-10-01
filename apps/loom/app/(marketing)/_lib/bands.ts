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
  whatIsIt: "What is Loom?",
  seeItHappen: "See it happen",
  usingIt: "Using it",
  problems: "What this is for",
  facts: "Where it is today",
  asData: "How this page is put together",
  questions: "Questions",
  waysIn: "Keep going",
} as const

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
