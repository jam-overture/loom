import type { ReaderRegionCount } from "./region.js"
import type { FunnelAnswer, FunnelPair, ReaderTally } from "./rollup.js"

import type { RevisionViews } from "./page-views.js"

/**
 * What identifies a counter row, and the addition that folds two of them.
 *
 * Internal to the stores and deliberately not re-exported from
 * `@jam-overture/loom/signals`: it exists so that the two implementations
 * cannot drift on either half, not because a deployment has a question it
 * answers.
 *
 * ## Why a fold in front of the driver
 *
 * `ON CONFLICT … DO UPDATE` **refuses to affect one row twice in a single
 * command** — Postgres raises rather than applying the second value. The memory
 * store writes through a `Map` and so adds a duplicate key without noticing. So
 * two counts of the same row inside one call behaved differently in the two
 * implementations: the memory store added them and Postgres refused the whole
 * write. That is a disagreement between implementations rather than a limit of
 * either, and what it would have cost depended entirely on which counter it
 * reached — an `apply` that fails is loud and forgets nothing, a bucket at the
 * door that silently did not move is reported in a delivery's outcome and
 * nowhere else.
 *
 * The contract suite found it on the page views, which is the one counter a
 * caller composes by hand rather than reads off a rollup's map. Every other
 * producer in the repository keys its output by map first and so cannot emit a
 * duplicate — which is a property of today's callers and not of the interface
 * they are writing to. So the addition happens once, in front of the driver,
 * for all four counters.
 *
 * **The keys are here rather than beside each store** because the guarantee is
 * that the two stores agree about what one row is. Two spellings of a key that
 * are the same today are the shape this subsystem has already been bitten by.
 */

/** A revision, which is the two columns every counter here shares. */
const revisionKey = (row: { readonly treeId: string; readonly revision: number }): string =>
  `${row.treeId} ${row.revision}`

export const pageViewKey = (count: RevisionViews): string => revisionKey(count)

export const tallyKey = (tally: ReaderTally): string => `${revisionKey(tally)} ${tally.nodeId}`

const endOf = (end: FunnelPair["from"]): string => `${end.nodeId}:${end.kind}`

export const funnelKey = (answer: FunnelAnswer): string =>
  `${revisionKey(answer)} ${endOf(answer.pair.from)} ${endOf(answer.pair.to)}`

export const regionKey = (count: ReaderRegionCount): string =>
  `${revisionKey(count)} ${count.region}`

/**
 * Rows that name the same counter, added together, in the order they arrived.
 *
 * Stable in two ways that matter: a row's first appearance fixes its position,
 * so a fold never reorders a caller's list, and `add` is handed the standing row
 * first — so a non-additive column written by `add` keeps the same winner as the
 * `excluded.*` the upsert would have applied.
 */
export const foldedBy = <Row>(
  rows: readonly Row[],
  key: (row: Row) => string,
  add: (standing: Row, next: Row) => Row
): readonly Row[] => {
  const by = new Map<string, Row>()

  for (const row of rows) {
    const at = key(row)
    const standing = by.get(at)

    by.set(at, standing === undefined ? row : add(standing, row))
  }

  return [...by.values()]
}

/** The two numbers a page-view count carries, which is one. */
export const addPageViewCounts = (standing: RevisionViews, next: RevisionViews): RevisionViews => ({
  ...next,
  views: standing.views + next.views,
})

/**
 * Every counter on a tally, added.
 *
 * `type` is the one column that is not a number, and the later row wins it —
 * which is what `SET type = excluded.type` does and what the memory store's
 * spread does, so the fold does not become a third answer.
 */
export const addTallies = (standing: ReaderTally, next: ReaderTally): ReaderTally => ({
  ...next,
  views: standing.views + next.views,
  reached: standing.reached + next.reached,
  engaged: standing.engaged + next.engaged,
  dwellMs: standing.dwellMs + next.dwellMs,
  activations: standing.activations + next.activations,
  opens: standing.opens + next.opens,
  closes: standing.closes + next.closes,
  completions: standing.completions + next.completions,
})

export const addFunnelAnswers = (standing: FunnelAnswer, next: FunnelAnswer): FunnelAnswer => ({
  ...next,
  reached: standing.reached + next.reached,
  converted: standing.converted + next.converted,
})

export const addRegionCounts = (
  standing: ReaderRegionCount,
  next: ReaderRegionCount
): ReaderRegionCount => ({ ...next, views: standing.views + next.views })
