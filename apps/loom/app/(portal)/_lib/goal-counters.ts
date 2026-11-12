import type { ActedReadRequest, ArrivalRange, ReaderTallyStore } from "@jam-overture/loom/signals"

import type { GoalCounters } from "./goal-range"

/**
 * What the counters are narrowed to: a page, a part, both, or neither, and an
 * audience (a segment, 0371 clause 6) or every reader.
 */
export type CounterScope = Pick<ActedReadRequest, "treeId" | "nodeId" | "audience">

/**
 * The hourly counters a goal's figure for a range is worked out from, read in
 * one go: page views and what readers did over the span asked (`goalSpanOf`,
 * the range and the period before it), and when the project first counted
 * anything readers did on any part.
 *
 * Every screen that measures a goal over a range reads through this (the
 * primary goal's figure on *Signals*, the drawer on *By page*, the 7-day rate
 * on *Goals*), so they cannot disagree about where counting began.
 *
 * `scope` narrows both reads the way the counters allow: to one page (a
 * drawer), to one part (a single goal), or to neither (every goal on the
 * project at once, which `goalRangeOf` then filters to each goal's part and
 * pages). An audience narrows both reads to one segment's readers, and the
 * page views' first hour is then the segment's, so a segment named on its
 * signals last week reads as counted from then. When counting began is always the project's, whatever the scope: a
 * part first pressed last week does not mean the project counted nothing
 * before it, and `countingBeginsOf` takes the later of the two.
 *
 * `undefined` where any of the three did not answer, which the screen says
 * rather than drawing a nought.
 */
export const readGoalCounters = async (
  tallies: Pick<ReaderTallyStore, "arrivals" | "acted">,
  span: ArrivalRange,
  scope: CounterScope = {}
): Promise<Omit<GoalCounters, "parts"> | undefined> => {
  const { treeId, audience } = scope
  const [arrivals, acted, actedBegins] = await Promise.all([
    tallies.arrivals({
      ...(treeId === undefined ? {} : { treeId }),
      ...(audience === undefined ? {} : { audience }),
      ...span,
    }),
    tallies.acted({ ...scope, ...span }),
    /** A read of one empty instant, whose answer carries the first hour whatever was asked. */
    tallies.acted({ from: span.from, to: span.from }),
  ])

  return arrivals.ok && acted.ok && actedBegins.ok
    ? { arrivals: arrivals.value, acted: acted.value, actedBegins: actedBegins.value.begins }
    : undefined
}
