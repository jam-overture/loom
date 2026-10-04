import { everyMemberOf } from "../closed-set.js"
import type { NodeId, TreeId } from "../ids.js"
import type { PrimitiveType } from "../primitive-type.js"
import type { PrimitiveRole } from "../role.js"

import { pageViewReadingOf, type StoredPageViews } from "./page-views.js"
import type { PageReading, PartStanding } from "./parts.js"

/**
 * How far into a page readers get, as a share of the readers there were.
 *
 * Every figure a reader screen will show is a rate, and this subsystem has
 * carried its numerator and its denominator in two places that never met. A
 * part's `reached` is distinct page views that saw it, added across rollup
 * windows, so a visit that straddled a boundary is counted twice and nobody
 * could say how often that happened. A page's openings are counted once at the
 * door, are exact, and add across windows, revisions and months. A reading
 * joined the first to the tree and used the largest row it could find as a
 * floor on how many readers there were; the exact number was one row away and
 * nothing fetched it.
 *
 * **This is that join, and what it buys is an honest rate where there was a
 * count nobody could qualify.** *About two hundred of the three hundred and
 * twenty readers who arrived got as far as the pricing band* is the sentence,
 * and the arithmetic that makes it sayable is a division nobody had to collect
 * anything for: it is the fifth thing taken out of the server-side join rather
 * than off the wire. Nothing is added to a payload, a browser, a column, a
 * store or the vocabulary.
 *
 * ## Two denominators, because they fail in opposite directions
 *
 * `appearances` is the same page views as the rollups counted them — once per
 * window each appeared in — so it carries the straddle over-count that a
 * part's `reached` carries, and dividing one by the other very nearly cancels
 * it. That is the argument the fall between two siblings is built on
 * ([0221](../../decisions/0221-where-reading-stops-is-a-fall-between-two-siblings-and-a-ratio-of-two-counts-off-one-row-set.md)),
 * one level up: a part against its page rather than a part against its
 * neighbour.
 *
 * `opened` is exact, and dividing by it gives something stronger than an
 * estimate and narrower in use: a **ceiling**. A part's `reached` is at least
 * the number of readers who really reached it, and the openings are a count of
 * readers that cannot be inflated by a window boundary, so the true share
 * cannot be above `reached ÷ opened`. The ratio can honestly sit above 1 —
 * which is why it is not the figure a stop is reported as — and when it does,
 * the ceiling says nothing and the fact that it says nothing is itself the
 * answer.
 *
 * **The gap between the estimate and the ceiling is the straddle**, which is
 * the measurement
 * [0219](../../decisions/0219-a-page-view-is-counted-once-at-the-door-and-the-over-count-in-the-node-counters-is-a-measurement.md)
 * published and nothing had used yet. It closes to nothing on a deployment
 * whose rollup window is long enough that nobody's visit spans two — and that
 * is the first time the one control a deployment has over this error can be
 * checked against a number after it is turned.
 *
 * ## What it refuses to say
 *
 * A share of readers is three divisions away from a profile of one, so the
 * things not here are worth naming. There is no page-level total of the
 * readers who got anywhere: one reader who reached four bands is in four rows,
 * and adding them counts them four times. There is no ranking, because where a
 * page loses readers is a question about two siblings and is answered
 * elsewhere. And a projection onto the exact denominator is withheld whenever
 * the collection is behind, because applying the rate of the page views that
 * have been folded to the page views that have not is a guess about readers
 * nobody has counted yet.
 *
 * Pure. It is handed a reading and the page-view rows, and reaches no store, no
 * clock and no DOM; it adds nothing to the broadcaster's import graph.
 */

/**
 * Why a share of readers cannot be given at all.
 *
 * Each one is a state of the deployment rather than of the page, so it is
 * reported once for the reading instead of on every part — and each is a
 * different sentence, which is the reason there are three rather than a null.
 */
export type ReachSilence =
  /**
   * No page-view row for this tree and revision.
   *
   * Either the counter has never been written for it — a deployment whose
   * intake predates the column, or one whose rows have expired — or the caller
   * read the rows for something else. The counters are still a floor on how
   * many readers there were, which is what a reading reported before this
   * join existed, so a surface has something to fall back to and should say
   * which it is showing.
   */
  | "unmeasured"
  /**
   * The row is there and nothing in it says a page view ever began.
   *
   * Two deployments look like this and the second is the one worth catching.
   * If no rollup has counted an appearance either, nobody has read this
   * revision and there is nothing to divide. If appearances have been counted,
   * **the senders are not marking their openings** — a page running a
   * broadcaster from before the marker shipped, or one whose opening delivery
   * is being lost — and every rate on the screen has no denominator while the
   * counters look healthy. That is a diagnosis nothing else in this subsystem
   * offers.
   */
  | "unopened"
  /**
   * Readers arrived and no rollup has folded a window yet.
   *
   * Everything is `pending`. It is what the first minutes of a deployment look
   * like, and what a stalled collection looks like for ever, and the two are
   * told apart by whether the number moves.
   */
  | "uncounted"

export const REACH_SILENCES: readonly ReachSilence[] = everyMemberOf<ReachSilence>()([
  "unmeasured",
  "unopened",
  "uncounted",
])

/** One line per silence, for a surface putting the reading in front of a person. */
export const describeReachSilence = (silence: ReachSilence): string => {
  switch (silence) {
    case "unmeasured":
      return "no page views have been counted for this version of the page"
    case "unopened":
      return "nothing has said a page view began, so there is no number to divide by"
    case "uncounted":
      return "readers have arrived and no window of their reading has been counted yet"
  }
}

/**
 * How far one part of a page got, against the readers there were.
 *
 * The identity and the standing are carried over from the reading rather than
 * re-derived, so a surface drawing this never has to hold two lists side by
 * side and match them up by id.
 */
export type PartReach = {
  readonly nodeId: NodeId
  readonly type: PrimitiveType
  /** What part it plays, or `null` where its type declared none (0114). */
  readonly role: PrimitiveRole | null
  /** 0 at the root, as the reading's outline gives it. */
  readonly depth: number
  readonly standing: PartStanding
  /**
   * Distinct page views that saw it, exactly as stored: added across rollup
   * windows and therefore generous (0147).
   *
   * Published beside the shares rather than hidden behind them, because it is
   * the only figure here that is not a division and the one to fall back to
   * when the pair cannot be reconciled.
   */
  readonly reached: number
  /**
   * The share of page views that got this far, as the rollups counted both
   * ends: `reached ÷ appearances`.
   *
   * The straddle over-count is in the numerator and the denominator and very
   * nearly divides out, which is what makes this the figure to show. It is an
   * estimate and not a bound, and the direction it leans is worth knowing: a
   * reader who stayed long enough to span two windows is counted twice on both
   * sides, and a reader who stays longer is likelier to have got deep into the
   * page — so for a part near the bottom this reads a little generous.
   *
   * **Its denominator is the page views that have been counted, which is not
   * every reader who arrived.** While openings are pending the two are
   * different populations, so this can sit above
   * {@link PartReach.atMost} — that is not a contradiction and the pending
   * figure is the explanation.
   *
   * `null` under a silence.
   */
  readonly share: number | null
  /**
   * The most the share could be: `reached ÷ opened`, never above 1.
   *
   * A ceiling rather than an estimate. The openings are a count of readers that
   * no window boundary can inflate, and `reached` is at least the number of
   * readers who really got here, so the true share is at or below this.
   *
   * **For a part nearly everybody reaches it is 1 and says nothing**, and that
   * is the ordinary state rather than a fault: a root is in the viewport of
   * every page view, so where any visit spanned two windows its `reached` is
   * above the openings on its own. The estimate is the figure with information
   * in it there; this is the one that bounds a part further down.
   *
   * `null` under a silence.
   */
  readonly atMost: number | null
  /**
   * The share applied to the exact count of readers who arrived — the number a
   * sentence can say out loud.
   *
   * Deliberately not rounded: it is a magnitude and not a census, and a surface
   * that rounds it is saying how precise it thinks it is.
   *
   * **One division of two whole numbers, not the share multiplied back up.**
   * The two are the same arithmetic in exact numbers and not in a float —
   * seven readers out of a hundred, times a hundred, is seven and a
   * quadrillionth, which is above the most readers who could have got there and
   * would make this figure break its own ceiling.
   *
   * Withheld in three states rather than given as a number nobody could stand
   * behind: under a silence; whenever the collection is behind, because
   * openings a rollup has not reached yet are readers whose reading nobody has
   * counted and projecting the folded rate onto them would answer a question
   * about people who were never measured; and where the two counters cannot be
   * reconciled, because a count of people above the number of people who
   * arrived is the one figure a screen must never show.
   */
  readonly readers: number | null
  /**
   * The most readers who could have got here: the smaller of `reached` and the
   * openings, which is a whole number of real page views either way.
   *
   * `null` under a silence. Where {@link PartReach.readers} is given it is
   * never above this.
   */
  readonly atMostReaders: number | null
  /**
   * More reach than there were page views to be reached in, so the share sits
   * above 1 and no figure here can be drawn.
   *
   * Reach is counted out of the same windows as the appearances it is divided
   * by, and a view that reached a part in a window is a view that appeared in
   * it — so rows written by the same rollups cannot produce this. Two things
   * can. **Node counters older than the page-view column**, added up over
   * windows whose appearances were never kept, which is what an upgraded
   * deployment's first reading looks like. Or a caller who concatenated two
   * reads of the counters instead of letting the store add them, which the
   * reading upstream reports as a duplicated node.
   *
   * It is not the ordinary straddle: `reached` above the *openings* is
   * expected, and is what {@link PartReach.atMost} being 1 means.
   *
   * A surface should show `reached` and say it cannot yet be put as a share.
   */
  readonly unreconciled: boolean
}

/**
 * A window of counters, read against the exact number of readers that window
 * had.
 *
 * The page-view figures are the ones a reading of that counter alone would
 * give, carried here so that a surface drawing shares has the arithmetic behind
 * them on the same object and does not have to pair two readings up by hand.
 */
export type PageReach = {
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
  /**
   * The floor the counters give on their own: the largest `views` any one row
   * reports.
   *
   * What a reading had to use as a denominator before there was an exact one,
   * kept so that a deployment can see the difference the join made rather than
   * being told it was wrong. Against an honest sender it sits at or below the
   * openings plus the straddle.
   */
  readonly countedViews: number
  /**
   * Set where no share can be given, and the reason. `null` where they can.
   */
  readonly silence: ReachSilence | null
  /**
   * Nobody's visit spanned two windows, so there is nothing to divide out: the
   * estimate and the ceiling are the same number and the shares are exact.
   *
   * False under a silence, and false while any opening is pending.
   */
  readonly exact: boolean
  /** Every part of the revision, in reading order, as the reading had them. */
  readonly parts: readonly PartReach[]
  /**
   * The parts whose reach could not be reconciled with the openings.
   *
   * Empty is the healthy state. A non-empty list on a deployment whose drift is
   * nought is not a straddle and not a lie: it is node counters older than the
   * column they are being divided by.
   */
  readonly unreconciled: readonly NodeId[]
  /**
   * Page-view rows handed in for another tree or another revision, and ignored.
   *
   * Dividing one revision's counters by another's readers is the mistake that
   * would make every rate here quietly wrong, so this filters rather than
   * trusts its caller — and says how much it dropped, because a caller who
   * passed a whole store's rows and one who passed the wrong revision's look
   * identical from the inside.
   */
  readonly foreign: number
  /**
   * Rows for this tree and revision beyond the first, where every one after it
   * was ignored.
   *
   * A store keeps one row per revision, so this cannot happen from one read —
   * it happens when a caller concatenates two reads. Adding them is wrong,
   * because the openings are already a total and would double; taking the last
   * is wrong, because it is not the truer one. So the first row stands and the
   * fact is reported.
   */
  readonly duplicated: number
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

/**
 * Read a window's counters against the readers that window had.
 *
 * The reading names the tree and the revision it was built for, so the rows are
 * filtered to it here rather than being trusted: there is no way to ask this
 * question about a revision without holding the revision, which is the property
 * the join upstream has and this one keeps.
 *
 * Linear in the parts and in the rows, with one pass over each.
 */
export const pageReachOf = (
  reading: PageReading,
  rows: readonly StoredPageViews[]
): PageReach => {
  const matching = rows.filter(
    (row) => row.treeId === reading.treeId && row.revision === reading.revision
  )

  /**
   * The row's two numbers, read through the page-view reading rather than
   * subtracted again here. One definition of drift, pending and inflation is
   * the point: a second one would be a second place for them to disagree with
   * the counter they describe.
   */
  const measured = matching[0] === undefined ? undefined : pageViewReadingOf([matching[0]])

  const { opened, appearances, drift, pending, inflation, updatedAt } =
    measured?.revisions[0] ?? NOTHING_MEASURED

  const silence: ReachSilence | null =
    measured === undefined ? "unmeasured" : silenceOf(opened, appearances)

  const exact = silence === null && appearances === opened

  const parts = reading.parts.map((part): PartReach => {
    const reached = part.counters?.reached ?? 0
    const unreconciled = silence === null && reached > appearances

    const share = silence === null ? reached / appearances : null
    const atMost = silence === null ? Math.min(1, reached / opened) : null

    return {
      nodeId: part.nodeId,
      type: part.type,
      role: part.role,
      depth: part.depth,
      standing: part.standing,
      reached,
      share,
      atMost,
      readers:
        share === null || pending > 0 || unreconciled ? null : (reached * opened) / appearances,
      atMostReaders: silence === null ? Math.min(reached, opened) : null,
      unreconciled,
    }
  })

  return {
    treeId: reading.treeId,
    revision: reading.revision,
    opened,
    appearances,
    drift,
    pending,
    inflation,
    updatedAt,
    countedViews: reading.views,
    silence,
    exact,
    parts,
    unreconciled: parts.filter((part) => part.unreconciled).map((part) => part.nodeId),
    foreign: rows.length - matching.length,
    duplicated: Math.max(0, matching.length - 1),
  }
}
