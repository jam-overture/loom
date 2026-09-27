import type { LoomTree, TreeId } from "@jam-overture/loom"

import { seedTree } from "./seed"

/**
 * The trees this portal can prove the starting shape of.
 *
 * `auditSnapshot` folds a log from a seed and compares the result with the
 * snapshot. The seed is a parameter rather than something the store keeps —
 * 0016 made the log the truth and the snapshot a view, and neither of those is
 * revision 0 once a single delta has been accepted. So a host that cannot
 * reproduce a tree's original shape cannot audit it, and the honest answer is to
 * say so rather than to fold from the answer being checked.
 *
 * This portal seeds exactly one tree, deterministically, from a builder in
 * source (`seed.ts`). That is what makes it auditable: the seed is not a stored
 * copy that could have been overwritten, it is re-derived from the same code
 * that created the tree in the first place.
 *
 * Built lazily and memoised — `seedTree()` walks a builder chain, and the
 * registry is consulted on a request path.
 */

let registry: ReadonlyMap<TreeId, LoomTree> | undefined

const knownSeeds = (): ReadonlyMap<TreeId, LoomTree> => {
  if (registry === undefined) {
    const seed = seedTree()
    registry = new Map([[seed.treeId, seed]])
  }

  return registry
}

/** The tree's original shape, or `undefined` if this host never knew it. */
export const seedFor = (treeId: TreeId): LoomTree | undefined => knownSeeds().get(treeId)

export const isAuditable = (treeId: TreeId): boolean => knownSeeds().has(treeId)
