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

/**
 * A count taken against one page, put on the scale its door counts in.
 *
 * `count × counted ÷ appearances`: the count's own sound share of that page's
 * appearances (0229), weighted by the page views a rollup actually folded
 * (0250). It is the expression every reader-weighted figure over a library is
 * built out of, and it was **five hand-written copies of it** — one in a kind's
 * share of readers, two in what readers do inside a kind, two in a comparison of
 * the first — which is the state this module was created to end and did not
 * quite reach: {@link PageDoor} held the per-page half of the rule and the
 * per-placement half stayed at each call site.
 *
 * Three **ranking keys** then turned out to be the same rule written a sixth,
 * seventh and eighth time as `count ÷ (1 + inflation)` — the order of
 * conversions (0333), of falls (0250) and of movements (0291). All three read
 * this one now (0346).
 *
 * `scaledBy` is a **second** door, for the one caller that needs one: a
 * comparison asks what one side's reading would have come to with the other
 * side's traffic behind it, so the share is of the door the count came from and
 * the weight is the other's. It defaults to the door the count came from, which
 * is every other caller.
 *
 * **Total, and the two short-circuits are the reason three ranking keys can
 * share it** (0346). It was documented as *only ever called for a door with no
 * silence, where `appearances` is positive*, and that precondition is what kept
 * the orders of falls and of movements writing the rule a second time by hand as
 * `count ÷ (1 + inflation)` — a division-first spelling that is total where this
 * one divided by nothing. Both cases are now answered here:
 *
 * - **A door that folded nothing has nothing to divide out.** With no
 *   appearances there is no scale to put the count on and no straddle in it to
 *   remove, so the count is its own figure. The alternative is a `NaN` in a
 *   ranking key, which sorts wherever the comparator leaves it.
 * - **A scale that is the identity is taken exactly.** Where the weight equals
 *   the appearances it divides — every page with no drift, which is most of
 *   them — `count × n ÷ n` is the count mathematically and **not** in floats:
 *   `0.1 × 3 ÷ 3` is `0.10000000000000002`. A movement of a share is not a whole
 *   number, so a page the door has nothing to correct would have had its
 *   published figure moved by the correction. Returning the count says the same
 *   thing and says it in the last place too.
 *
 * **The multiplication comes before the division** otherwise, which is not a
 * style: the three floats agree to fifteen places in either order and not to
 * sixteen, and 0229 has already been bitten by exactly that. Over 22,100 integer
 * triples where the scale is not the identity, this spelling is never further
 * from the exact value than the division-first one and is strictly closer in
 * 4,963 of them.
 */
export const atDoorScale = (count: number, of: PageDoor, scaledBy: PageDoor = of): number =>
  of.appearances === 0 || scaledBy.counted === of.appearances
    ? count
    : (count * scaledBy.counted) / of.appearances
