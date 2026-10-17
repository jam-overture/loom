import type { AudienceId } from "../audience/audience.js"
import type { TreeId } from "../ids.js"

/**
 * Which audience a window of counters is of, and what that makes one reading.
 *
 * [0263](../../decisions/0263-a-page-is-a-base-tree-and-the-deltas-an-audience-earns.md)
 * made a page one base tree plus the deltas an audience earns, composed in the
 * customer's own process per request — so two audiences read **one tree at one
 * revision** and see two forms of it.
 * [0284](../../decisions/0284-a-signal-names-the-audience-it-was-collected-under-and-the-predicate-stays-in-the-control-plane.md)
 * put the audience on all five reader tables and said, in its own consequences,
 * what that leaves undone: *the portal gains a dimension it must not silently
 * collapse*, and *no screen reads this yet*.
 *
 * **The stores keep two audiences apart and every reading folded them back
 * together.** `counters.ts` already has `inAudience` so the memory store cannot
 * merge two rows that Postgres holds apart by its primary key. Nothing above
 * the store had been told: a reading is keyed by a tree and a revision, which
 * two audiences share, so the second audience's rows were dropped as *handed in
 * twice* — the one thing 0158 makes permanent, reported as a fault on a
 * deployment doing exactly what 0263 built.
 *
 * ## One rule, because a duplicate is whatever the key says it is
 *
 * {@link readingKeyOf} is the whole of this module's argument. Five readings
 * decide, each in its own loop, whether two readings handed in are one page
 * counted twice; what makes them one is a tree, a revision **and** an audience,
 * and five spellings of that which agree today are the shape this subsystem has
 * been bitten by before (`counters.ts`, `funnelPairKey`). It is published once
 * and imported five times.
 *
 * ## Splitting is the caller's, and it is a filter rather than a sum
 *
 * The other half is {@link byAudience}, which turns a window a deployment read
 * into one window per audience. A caller that splits first gets every reading
 * in this subsystem correct with no change to any of them, because each is then
 * handed one population's counters. A caller that does not is not quietly given
 * a number over two populations: `pageReadingOf` reads neither and says which
 * audiences it was handed (`audiences-mixed` in `health.ts`).
 *
 * Nothing here is about a reader. An `aud_` is a name the host chose for a
 * predicate Loom never sees, and splitting on it is grouping rows by a column
 * the host wrote — no payload, no browser, no column and no kind (rule 1).
 */

/** A row the store keeps one of per audience (0284). */
export type AudienceScoped = {
  readonly audienceId: AudienceId
}

/**
 * A row that may or may not name its audience.
 *
 * `ReaderTally` is what a rollup produces and it carries no audience — a rollup
 * folds one audience's window, so the column is on the row the store keeps and
 * not on the counter itself (0284). A reading is therefore handed rows that
 * sometimes name an audience and sometimes cannot, and *cannot* is a third
 * state rather than a default: a hand-built window with no audience anywhere in
 * it is one population by construction, and calling it `aud_everyone` would be
 * asserting something no row said.
 */
export type MaybeAudienceScoped = {
  readonly audienceId?: AudienceId
}

/** A reading, or a row, as the key rule below needs to see it. */
export type ReadingOfAudience = {
  readonly treeId: TreeId
  readonly revision: number
  /** `null` or absent where nothing recorded which audience the window was of. */
  readonly audienceId?: AudienceId | null
}

/** Sorted so a split is in the same order whatever order the rows arrived in. */
const sorted = (audiences: Iterable<AudienceId>): readonly AudienceId[] =>
  [...audiences].sort((one, other) => one.localeCompare(other))

/**
 * The audiences a window names, deduplicated and in a stable order.
 *
 * Rows naming none are not an audience and are not counted as one. A window of
 * them answers `[]`, which is *nothing here says* rather than *one audience* —
 * the distinction `MaybeAudienceScoped` exists for.
 */
export const audiencesIn = <R extends MaybeAudienceScoped>(
  rows: readonly R[]
): readonly AudienceId[] => {
  const found = new Set<AudienceId>()

  for (const row of rows) {
    if (row.audienceId !== undefined) found.add(row.audienceId)
  }

  return sorted(found)
}

/**
 * The rows of one audience, and nothing else.
 *
 * A row naming no audience is not in any audience's window. A caller holding
 * such rows is holding something no store produced, and silently folding them
 * into whichever audience was asked for would be this module inventing the
 * fact it exists to keep.
 */
export const forAudience = <R extends MaybeAudienceScoped>(
  audience: AudienceId,
  rows: readonly R[]
): readonly R[] => rows.filter((row) => row.audienceId === audience)

/** One audience's window, as {@link byAudience} hands it over. */
export type AudienceWindow<R> = {
  readonly audience: AudienceId
  readonly rows: readonly R[]
}

/**
 * A window a deployment read, split into the populations it actually holds.
 *
 * Exhaustive and lossless: every row is in exactly one window, each window's
 * rows keep the order they arrived in, and the windows themselves are in a
 * stable order so two reads of one store produce the same list. A deployment
 * serving one form of every page gets one window, which is what it has always
 * had.
 */
export const byAudience = <R extends AudienceScoped>(
  rows: readonly R[]
): readonly AudienceWindow<R>[] => {
  const windows = new Map<AudienceId, R[]>()

  for (const row of rows) {
    const held = windows.get(row.audienceId)

    if (held === undefined) windows.set(row.audienceId, [row])
    else held.push(row)
  }

  return sorted(windows.keys()).map((audience) => ({
    audience,
    rows: windows.get(audience) ?? [],
  }))
}

/**
 * What makes two readings one page: the tree, the revision and the audience.
 *
 * The one place that decides what a duplicate is. Five readings refuse to count
 * a page twice — the health of a collection, the order over a deployment's
 * pages, and the three censuses of a library — and before this they refused on
 * a tree and a revision, which two audiences of one page share. So a deployment
 * that began serving a second form had that form's reading dropped as a repeat
 * of the first, and the number it was dropped out of went on looking right
 * (0158: a count that has been added cannot be unadded, and one that was never
 * added cannot be noticed).
 *
 * A reading naming no audience keys as itself, so a window of rows that never
 * carried the column behaves exactly as it did.
 */
export const readingKeyOf = (reading: ReadingOfAudience): string =>
  `${reading.treeId}\u0000${reading.revision}\u0000${reading.audienceId ?? ""}`
