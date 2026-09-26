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
  seeItHappen: "See it happen",
  inYourOwnWords: "Your turn",
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
  inYourOwnWords: "your-turn",
} as const satisfies Partial<Record<BandName, string>>
