import type { RevisionPageViews } from "./page-views.js"
import type { ReachSilence } from "./reach.js"

/**
 * The scale a page's door counts in, which three readings of a library share.
 *
 * A share of the readers who met something is a weighted mean of per-page
 * shares, and every term of it has to be put on the scale the door counts in
 * before two pages can be added together
 * ([0250](../../decisions/0250-a-deployment-is-ordered-by-readers-lost-at-the-doors-scale-and-a-page-the-door-cannot-scale-is-out-of-the-order.md),
 * [0256](../../decisions/0256-a-kinds-share-of-the-readers-who-met-it-is-a-weighted-mean-of-sound-shares-at-the-doors-scale.md)).
 * That scaling is one rule, and until a third reading needed it, it was **two
 * hand-written copies of one rule**: a kind's share of the readers who met it
 * and a census of what readers do inside a kind of part
 * ([0265](../../decisions/0265-what-readers-do-inside-a-kind-of-part-is-a-share-of-the-readers-who-met-it-and-the-door-is-only-a-weight.md))
 * each carried their own, and a comparison of two windows of the first would
 * have carried a third.
 *
 * Two spellings of one rule that agree today are a thing this subsystem has
 * been bitten by before — the upsert keys of the four counter tables, moved
 * into `counters.ts` so that two stores could not drift about what one row is
 * — so the rule is written once here and the readings import it.
 *
 * The numbers are the page's rather than any part's, so a reading works one of
 * these out per page and not per placement: a library of forty pages is tens of
 * thousands of placements, and the row lookup is a filter over the rows.
 *
 * Pure, and the arithmetic is a minimum of two whole numbers. It reaches no
 * store, no clock and no DOM, and nothing in it survives into a browser bundle.
 */

/** What one page's door contributes to every figure taken against its readers. */
export type PageDoor = {
  /**
   * `min(appearances, opened)`: the page views a rollup folded, at the door's
   * scale.
   *
   * It is `appearances ÷ (1 + inflation)` and is **taken as that minimum of two
   * whole numbers**, because the division of three floats agrees with it to
   * fifteen places and not to sixteen — which a share of readers has already
   * been bitten by (0229).
   */
  readonly counted: number
  /**
   * The row's openings, whatever the silence.
   *
   * Carried even where this page cannot be scaled, because a reading's own
   * count of arrivals is a count of page views the door made and not a count of
   * the ones a share could be taken of.
   */
  readonly opened: number
  readonly appearances: number
  readonly drift: number
  readonly pending: number
  /** Set where this page cannot be scaled, in the page's own vocabulary. */
  readonly silence: ReachSilence | null
}

/**
 * The page's door, with the three reasons tried in the order a page's own
 * reading tries them in.
 *
 * No row before nothing opened, because *there is no row* is the state a
 * deployment can be in without its senders being at fault.
 */
export const doorOf = (row: RevisionPageViews | null): PageDoor => {
  if (row === null) {
    return { counted: 0, opened: 0, appearances: 0, drift: 0, pending: 0, silence: "unmeasured" }
  }

  const of = {
    counted: Math.min(row.appearances, row.opened),
    opened: row.opened,
    appearances: row.appearances,
    drift: row.drift,
    pending: row.pending,
  }

  if (row.opened === 0) return { ...of, silence: "unopened" }
  if (row.appearances === 0) return { ...of, silence: "uncounted" }

  return { ...of, silence: null }
}
