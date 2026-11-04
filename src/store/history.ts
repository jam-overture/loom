import type { TreeId } from "../ids.js"
import { ok, type Result } from "../result.js"
import type { LoomTree } from "../tree/tree.js"

import type { StoreError } from "./errors.js"
import { describeTreeAt, treeAt, treesAt, type TreeAtRevision } from "./replay.js"
import type { TreeReader } from "./store.js"

/**
 * The tree as it was, asked of one handle.
 *
 * Every function in this directory that answers for a past revision —
 * `replayTree`, `treeAt`, `treesAt`, `auditSnapshot`, `planRevert` — takes the
 * seed as a parameter, because 0016 keeps only the head snapshot and a log from
 * revision 1, so revision 0 is the one version a store cannot produce. 0028
 * decided where it comes from instead: **the host**, re-derived from the code
 * that created the tree, which is what makes it evidence rather than a second
 * copy of the data being checked.
 *
 * What 0028 left in one deployment is the *lookup*. `seedFor(treeId)` was the
 * portal's own registry, so a consumer holding a `TreeReader` could not ask for
 * a past revision at all, and the absence of a seed had no published shape — the
 * portal invented `{ kind: "unknown-start" }` for it in `progression.ts` and the
 * next consumer would have invented its own. This joins the two halves: a
 * history is a reader and a seed source, and *"this host cannot prove where this
 * tree started"* is an answer it gives rather than a case each caller discovers.
 *
 * **Nothing here stores a seed, and the schema is untouched.** A stored revision
 * 0 is still the alternative 0028 rejected on scope and this records again.
 */

/**
 * Where a host's trees started, by id, or `undefined` for a tree it cannot
 * prove the beginning of.
 *
 * Synchronous on purpose, and the reason is 0028's rather than convenience: a
 * seed is evidence only because it is re-derived from the source that built the
 * tree. A lookup that needed IO would be reading a seed back from storage, which
 * is the route 0028 rejected outright — it compares the data with itself.
 */
export type SeedSource = (treeId: TreeId) => LoomTree | undefined

/**
 * A seed source over a fixed set of trees.
 *
 * Thunks rather than trees: a deployment naming every seed it knows should not
 * build all of them to answer about one, and most calls ask about one. Nothing
 * is cached between calls, so two answers for the same tree are two independent
 * derivations from source — the property the audit depends on.
 */
export const seedRegistry = (seeds: ReadonlyMap<TreeId, () => LoomTree>): SeedSource => {
  return (treeId) => seeds.get(treeId)?.()
}

/**
 * The tree as it was, or why not.
 *
 * `unseeded` is the member `TreeAtRevision` has no room for, and it is a
 * statement about the *host* rather than about the log or the revision: the
 * store may hold a perfectly readable history that this deployment cannot fold,
 * because it cannot produce the shape the fold starts from. It costs no read —
 * a history that cannot answer does not touch the log to find that out.
 */
export type TreeVersion =
  | TreeAtRevision
  | { readonly outcome: "unseeded"; readonly treeId: TreeId; readonly revision: number }

/** One sentence per answer, extending `describeTreeAt` with the host's case. */
export const describeTreeVersion = (version: TreeVersion): string =>
  version.outcome === "unseeded"
    ? `revision ${version.revision} of ${version.treeId} cannot be replayed: this host has no seed for it`
    : describeTreeAt(version)

/**
 * A reader and the seeds that make its log foldable.
 *
 * Two methods and not three: `head` is already on the `TreeReader` a caller
 * builds this from, and a history that re-exported it would offer two ways to
 * ask for the current tree — one of which folds the whole log to answer what the
 * snapshot already holds.
 */
export type TreeHistory = {
  readonly at: (treeId: TreeId, revision: number) => Promise<Result<TreeVersion, StoreError>>
  /**
   * The same question about several revisions of one tree, folded once. Keyed by
   * revision, as `treesAt` is, and the two-revision case is what it exists for:
   * a before-and-after reading is one revision against another.
   */
  readonly atEach: (
    treeId: TreeId,
    revisions: readonly number[]
  ) => Promise<Result<ReadonlyMap<number, TreeVersion>, StoreError>>
}

export const historyOf = (reader: TreeReader, seeds: SeedSource): TreeHistory => ({
  at: async (treeId, revision) => {
    const seed = seeds(treeId)
    if (seed === undefined) return ok({ outcome: "unseeded", treeId, revision })

    return treeAt(reader, { treeId, revision, seed })
  },

  atEach: async (treeId, revisions) => {
    const seed = seeds(treeId)
    if (seed === undefined) {
      return ok(
        new Map(
          revisions.map((revision) => [
            revision,
            { outcome: "unseeded", treeId, revision } as const,
          ])
        )
      )
    }

    return treesAt(reader, { treeId, revisions, seed })
  },
})
