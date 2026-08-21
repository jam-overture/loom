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
  problems: "What this is for",
  facts: "Where it is today",
  questions: "Questions",
  waysIn: "Keep going",
} as const

export type BandName = keyof typeof BAND
