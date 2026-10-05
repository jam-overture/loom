import { everyMemberOf } from "../closed-set.js"
import type { TreeId } from "../ids.js"

import { pageViewsFor, type RevisionOf, type StoredPageViews } from "./page-views.js"
import type { ReachSilence } from "./reach.js"
import type { FunnelPair } from "./rollup.js"
import type { StoredFunnel } from "./tally.js"

/**
 * A funnel, read against the readers who arrived.
 *
 * A `FunnelAnswer` is two counts off one window: the page views that satisfied
 * one end of a pair, and the ones that satisfied both. Divided into each other
 * they give a rate, and that rate is the one figure in this subsystem that
 * never needed a denominator handed to it — it is
 * [0221](../../decisions/0221-where-reading-stops-is-a-fall-between-two-siblings-and-a-ratio-of-two-counts-off-one-row-set.md)'s
 * cancellation again, two counts off the same rows.
 *
 * **It is also not the number anybody quotes.** A deployment asking *what is
 * our conversion rate* means *of the readers who arrived*, and a pair whose
 * `from` almost nobody reaches can post a magnificent rate while converting
 * four people. The exact count of arrivals has been in
 * [`page-views.ts`](page-views.ts) since §8 and nothing joined the two, so the
 * funnel was the last counter here with no honest share of its own.
 *
 * **This is that join**, and it is the sixth thing taken out of the server-side
 * reading rather than off the wire: nothing is added to a payload, a browser, a
 * column, a store or the vocabulary.
 *
 * ## Three shares that add up, which is the point
 *
 * Every arrival is in exactly one of three states, and naming all three is what
 * makes the reading act on something rather than report something:
 *
 * - {@link PairReach.lostBefore} — never reached the first end;
 * - {@link PairReach.lostBetween} — reached it and did not convert;
 * - {@link PairReach.conversion}'s share — did both.
 *
 * They partition the appearances, so they sum to 1 wherever all three can be
 * given. **The two losses have opposite remedies** — a page nobody scrolls to
 * the pricing band is a different problem from a pricing band nobody buys from
 * — and `rate` on its own cannot tell them apart, because the first loss is
 * entirely in its denominator. {@link PairReach.worse} names which stage costs
 * more readers.
 *
 * ## The straddle leans the other way here, and 0147 says it does not
 *
 * [0147](../../decisions/0147-a-rollup-is-added-to-what-is-stored-and-a-distinct-view-count-is-therefore-approximate.md)
 * records that *a conversion rate is honest and a view count is slightly
 * generous*, on the ground that a funnel answer is computed inside one rollup
 * run where distinctness is exact. That is true of one answer and **not of the
 * stored row**, which `addFunnelAnswers` adds across every window the counters
 * have seen. A page view whose reader met the first end in one window and
 * converted in the next contributes `reached 1, converted 0` to the first and
 * nothing to the second: the conversion is not double-counted, it is **lost**.
 *
 * So `rate` is the one figure in this subsystem biased *downward* by the
 * straddle, where `reached`, `views` and every share taken off them are biased
 * up. That is the safe direction for *readers convert* and the unsafe one for
 * *this funnel is broken*, which is the claim somebody acts on — so the bias is
 * bounded rather than mentioned: {@link PairReach.rateAtMost} spends §8's drift
 * on the only error bar this subsystem can compute for a funnel.
 *
 * ## What it refuses to say
 *
 * **There is no ranking across pairs.** §9 ranks siblings of one page because
 * siblings are comparable; two funnel pairs are two questions a deployment
 * wrote down about different nodes and different kinds, and the pair that loses
 * the most readers is reliably the one whose `from` is deepest in the page.
 * Ranking them would put a true number at the top of a screen as an answer to a
 * question nobody asked.
 *
 * **There is no page-level total of readers converted.** One page view can
 * satisfy several pairs, so adding them counts it several times — the same
 * arithmetic that keeps `engaged` off every per-role total (0147, 0167).
 *
 * ## One vocabulary for why there is no denominator
 *
 * {@link ReachSilence} is reused rather than restated. The three states it
 * names — no row for the revision, a row that says no page view ever began, and
 * arrivals no rollup has folded — are states of the *deployment* rather than of
 * the question being asked, so a funnel reading and a part reading are silent
 * for the same three reasons and a surface handles them once. `unopened` is
 * still the one worth catching: senders that are not marking their openings
 * leave every rate here denominator-less while the counters look healthy.
 *
 * Pure. It is handed the counters and the page-view rows and reaches no store,
 * no clock and no DOM; it adds nothing to the broadcaster's import graph.
 */

/** Where a funnel loses readers, of the two places it can. */
export type FunnelStage =
  /** Arrivals that never satisfied the pair's first end. */
  | "before"
  /** Arrivals that satisfied the first end and not the second. */
  | "between"

export const FUNNEL_STAGES: readonly FunnelStage[] = everyMemberOf<FunnelStage>()([
  "before",
  "between",
])

/** One line per stage, for a surface putting the reading in front of a person. */
export const describeFunnelStage = (stage: FunnelStage): string => {
  switch (stage) {
    case "before":
      return "most of the readers lost never got to the start of this funnel"
    case "between":
      return "most of the readers lost got to the start of this funnel and did not finish it"
  }
}

/**
 * A count of page views, put as a share of the readers there were.
 *
 * The same quartet
 * [0229](../../decisions/0229-a-share-of-readers-is-estimated-against-the-appearances-and-bounded-against-the-openings.md)
 * settled for a part's reach, because the two denominators fail in opposite
 * directions for a funnel end exactly as they do for a part: the appearances
 * carry the straddle the numerator carries and very nearly cancel it, and the
 * openings are exact and therefore bound it.
 */
export type FunnelShare = {
  /**
   * The estimate, against the page views the rollups counted:
   * `count ÷ appearances`.
   *
   * The figure to show. `null` under a silence or where the counters and the
   * row cannot be reconciled.
   */
  readonly share: number | null
  /**
   * The ceiling, against the page views that began: `count ÷ opened`, never
   * above 1.
   *
   * For an end nearly every reader satisfies it is 1 and says nothing, which is
   * the ordinary state rather than a fault. `null` under a silence.
   */
  readonly atMost: number | null
  /**
   * The share applied to the exact count of arrivals — the number a sentence
   * says out loud.
   *
   * One division of two whole numbers rather than the share multiplied back up
   * (0229): seven in a hundred times a hundred is seven and a quadrillionth in
   * a float, which breaks its own ceiling. Deliberately not rounded; a surface
   * that rounds it is saying how precise it thinks it is.
   *
   * Withheld while any opening is pending, because projecting a folded rate
   * onto page views no rollup has reached answers a question about readers
   * nobody measured.
   */
  readonly readers: number | null
  /**
   * The most readers it could be: the smaller of the count and the openings,
   * which is a whole number of real page views either way. `null` under a
   * silence.
   */
  readonly atMostReaders: number | null
}

const NOTHING_SHARED: FunnelShare = {
  share: null,
  atMost: null,
  readers: null,
  atMostReaders: null,
}

/** One pair of a revision, as stored and as a share of the readers there were. */
export type PairReach = {
  readonly pair: FunnelPair
  /**
   * Page views that satisfied `from`, exactly as stored: added across rollup
   * windows and therefore generous (0147).
   */
  readonly reached: number
  /**
   * Page views that satisfied both ends, exactly as stored.
   *
   * Added across windows like everything else, and **the one counter here that
   * a straddle can lose rather than duplicate** — see the module note. Never
   * above {@link PairReach.reached}, because every window's answer satisfies
   * that and a sum of such answers does too.
   */
  readonly converted: number
  /** When the funnel row last moved. */
  readonly updatedAt: string
  /**
   * `converted ÷ reached` — of the readers who got to the first end, the share
   * that finished.
   *
   * Two counts off one row, so the straddle over-count is in both and very
   * nearly divides out. What does *not* divide out is the conversion a straddle
   * splits across two windows and loses, so this is a **floor** on the true
   * rate wherever {@link FunnelReach.exact} is false.
   *
   * `null` where nothing reached the first end: the question has no answer
   * rather than the answer nought.
   */
  readonly rate: number | null
  /**
   * The most the true rate could be, given the straddle §8 measured.
   *
   * A page view that straddled a window could have had its conversion split
   * and lost, so the true `converted` is at most `converted + split` where
   * `split` is the smaller of the drift and the conversions still missing. The
   * same straddle inflates `reached`, so the true `reached` is at least
   * `reached − drift`. Both worst cases together, capped at 1.
   *
   * It closes onto {@link PairReach.rate} where nobody's visit spanned two
   * windows, and it opens wide where a deployment's rollup window is short
   * relative to how long readers stay — which is the first time the rollup
   * window's length can be read off a funnel rather than argued about (0147).
   *
   * `null` under a silence, where there is no measured drift to bound it with,
   * and `null` wherever {@link PairReach.rate} is.
   */
  readonly rateAtMost: number | null
  /** Of the readers who arrived, the share that got to the first end. */
  readonly entry: FunnelShare
  /** Of the readers who arrived, the share that got to both. */
  readonly conversion: FunnelShare
  /**
   * The share of arrivals that never reached the first end.
   *
   * `null` under a silence or where {@link PairReach.unreconciled}. Where it is
   * given it is one of three shares that sum to 1.
   */
  readonly lostBefore: number | null
  /**
   * The share of arrivals that reached the first end and did not convert.
   *
   * `null` on the same terms as {@link PairReach.lostBefore}.
   */
  readonly lostBetween: number | null
  /**
   * Which of the two stages cost more readers, by headcount rather than by
   * share, which is the ranking rule for a fall between two siblings at its
   * two-element case (0221).
   *
   * `null` where neither is worse: the two losses are equal, which includes the
   * funnel that loses nobody. It is *neither stage is the one to look at*
   * rather than *there is nothing to look at*, and the two losses are published
   * beside it either way.
   */
  readonly worse: FunnelStage | null
  /**
   * More readers reached the first end than there were page views to reach it
   * in, so no share here can be drawn.
   *
   * Rows written by the same rollups cannot produce this: a view that satisfied
   * an end in a window is a view that appeared in it. What can is a funnel row
   * older than the page-view column, which is what an upgraded deployment's
   * first reading looks like, or a caller who concatenated two reads of the
   * counters.
   *
   * It is not the ordinary straddle — `reached` above the *openings* is
   * expected, and is what an {@link FunnelShare.atMost} of 1 means.
   */
  readonly unreconciled: boolean
}

/**
 * A revision's funnels, read against the exact number of readers that revision
 * had.
 *
 * The page-view figures are the ones a reading of that counter alone would
 * give, carried here so that a surface drawing shares has the arithmetic behind
 * them on the same object.
 */
export type FunnelReach = {
  readonly treeId: TreeId
  readonly revision: number
  /** Page views that began on this revision. Exact, and addable (0219). */
  readonly opened: number
  /** The same page views as the rollups counted them: once per window each appeared in. */
  readonly appearances: number
  /** Appearances in excess of openings — the straddle, measured. Never negative. */
  readonly drift: number
  /** Openings whose reading no rollup has folded yet. The other sign of the same subtraction. */
  readonly pending: number
  /** `drift ÷ opened`: how generous every distinct count here is. `null` when nothing opened. */
  readonly inflation: number | null
  /** When the page-view row last moved, or `null` where there is no row. */
  readonly updatedAt: string | null
  /** Set where no share can be given, and the reason. `null` where they can. */
  readonly silence: ReachSilence | null
  /**
   * Nobody's visit spanned two windows, so there is nothing to divide out: the
   * rates are exact and each `rateAtMost` equals its `rate`.
   *
   * False under a silence, and false while any opening is pending.
   */
  readonly exact: boolean
  /**
   * The revision's pairs, ordered by their two ends so a screen does not
   * reorder on a refresh. Deliberately not ranked — see the module note.
   */
  readonly pairs: readonly PairReach[]
  /** Page-view rows for another tree or revision, and ignored. */
  readonly foreign: number
  /** Page-view rows for this revision beyond the first, where the first stands. */
  readonly duplicated: number
  /**
   * Funnel rows for another tree or revision, and ignored.
   *
   * Filtered rather than trusted for the same reason the page-view rows are:
   * answering one revision's question with another revision's counters is a
   * figure nothing downstream could catch.
   */
  readonly foreignPairs: number
  /**
   * Funnel rows naming a pair already seen, where every one after the first was
   * ignored.
   *
   * A store keeps one row per pair per revision, so this is a caller who
   * concatenated two reads. Adding them would double a total that is already
   * one.
   */
  readonly duplicatedPairs: number
}

const NOTHING_MEASURED = {
  opened: 0,
  appearances: 0,
  drift: 0,
  pending: 0,
  inflation: null,
  updatedAt: null,
} as const

const silenceOf = (opened: number, appearances: number): ReachSilence | null => {
  if (opened === 0) return "unopened"
  if (appearances === 0) return "uncounted"

  return null
}

const endKey = (end: FunnelPair["from"]): string => `${end.nodeId} ${end.kind}`

const pairKey = (pair: FunnelPair): string => `${endKey(pair.from)} ${endKey(pair.to)}`

type Measured = {
  readonly opened: number
  readonly appearances: number
  readonly drift: number
  readonly pending: number
}

const shareOf = (count: number, of: Measured, drawable: boolean): FunnelShare => {
  if (!drawable) return NOTHING_SHARED

  return {
    share: count / of.appearances,
    atMost: Math.min(1, count / of.opened),
    readers: of.pending > 0 ? null : (count * of.opened) / of.appearances,
    atMostReaders: Math.min(count, of.opened),
  }
}

/**
 * The most the true rate could be, with both of the straddle's worst cases
 * applied: every conversion it could have lost recovered into the numerator,
 * and every duplicate it could have made taken out of the denominator.
 *
 * **The recovery deliberately has no cap of its own**, and that is worth a
 * sentence because the obvious shape has one. A recovered conversion cannot be
 * one the row already counted, so the honest numerator looks like
 * `converted + min(drift, reached − converted)` — and that clause can never
 * change the result. The two spellings differ only where
 * `converted + drift > reached`, and there both numerators are above the
 * denominator, so both are capped at 1. A clause that cannot be observed is a
 * clause nothing could falsify, so the cap at 1 is the whole of it.
 *
 * The denominator is floored at 1 rather than at `converted`, for the same
 * reason: it only has to keep the division defined.
 */
const rateCeilingOf = (reached: number, converted: number, drift: number): number =>
  Math.min(1, (converted + drift) / Math.max(1, reached - drift))

const reachOf = (row: StoredFunnel, of: Measured, silenced: boolean): PairReach => {
  const { reached, converted } = row
  const unreconciled = !silenced && reached > of.appearances
  const drawable = !silenced && !unreconciled

  const lost = of.appearances - reached
  const between = reached - converted

  return {
    pair: row.pair,
    reached,
    converted,
    updatedAt: row.updatedAt,
    rate: reached === 0 ? null : converted / reached,
    rateAtMost: silenced || reached === 0 ? null : rateCeilingOf(reached, converted, of.drift),
    entry: shareOf(reached, of, drawable),
    conversion: shareOf(converted, of, drawable),
    lostBefore: drawable ? lost / of.appearances : null,
    lostBetween: drawable ? between / of.appearances : null,
    worse: drawable && lost !== between ? (lost > between ? "before" : "between") : null,
    unreconciled,
  }
}

/**
 * Read a revision's funnels against the readers that revision had.
 *
 * The revision is handed in rather than inferred, so there is no way to ask
 * this question without holding the revision it is about — and both sets of
 * rows are filtered to it here rather than trusted, because the two mistakes
 * that would make every figure quietly wrong are a row from the wrong revision
 * and a row counted twice.
 *
 * Linear in the pairs and in the page-view rows, with one pass over each.
 */
export const funnelReachOf = (
  where: RevisionOf,
  funnels: readonly StoredFunnel[],
  rows: readonly StoredPageViews[]
): FunnelReach => {
  const { measured, foreign, duplicated } = pageViewsFor(where, rows)

  const { opened, appearances, drift, pending, inflation, updatedAt } = measured ?? NOTHING_MEASURED

  const silence: ReachSilence | null =
    measured === null ? "unmeasured" : silenceOf(opened, appearances)

  const of: Measured = { opened, appearances, drift, pending }

  const matching = funnels.filter(
    (row) => row.treeId === where.treeId && row.revision === where.revision
  )

  const seen = new Set<string>()
  const pairs = matching
    .filter((row) => {
      const key = pairKey(row.pair)
      if (seen.has(key)) return false
      seen.add(key)

      return true
    })
    .sort((one, other) => pairKey(one.pair).localeCompare(pairKey(other.pair)))
    .map((row) => reachOf(row, of, silence !== null))

  return {
    treeId: where.treeId,
    revision: where.revision,
    opened,
    appearances,
    drift,
    pending,
    inflation,
    updatedAt,
    silence,
    exact: silence === null && appearances === opened,
    pairs,
    foreign,
    duplicated,
    foreignPairs: funnels.length - matching.length,
    duplicatedPairs: matching.length - pairs.length,
  }
}
