import type { NodeId } from "../ids.js"

import { childrenOf, type LoomNode } from "./node.js"

/**
 * The tree, flattened into the reading order a list renders in.
 *
 * `walkTree` already yields every node, but it drops the two facts a list needs
 * and cannot recover afterwards: how deep a node sits, and where it sits among
 * its siblings. Recomputing either from a bare node requires a second traversal
 * per node, so the traversal that knows them carries them out.
 *
 * This is a view, not a structure. Nothing here is persisted and nothing caches:
 * a delta changes the tree, and the next outline is derived from the new one.
 * `index` is the position among the parent's children, which is the same number
 * an `insert` or a `move` names — an outline row is therefore enough to address
 * a position, not only a node.
 *
 * The walk carries an **explicit stack** and is not recursive, which is a
 * correctness requirement rather than a preference (0372). A recursive
 * generator delegating with `yield*` passes every value back up through each
 * delegating frame, so a node at depth *d* costs *d*, the walk costs the sum of
 * the depths rather than the number of nodes, and past about two thousand deep
 * it does not return at all.
 */

export type OutlineEntry = {
  readonly node: LoomNode
  /** 0 at the root. */
  readonly depth: number
  /** null at the root. */
  readonly parentId: NodeId | null
  /** Position among the parent's children; 0 at the root. */
  readonly index: number
}

function* walkOutline(root: LoomNode): Generator<OutlineEntry> {
  const pending: OutlineEntry[] = [{ node: root, depth: 0, parentId: null, index: 0 }]

  for (let entry = pending.pop(); entry !== undefined; entry = pending.pop()) {
    yield entry

    const nested = Array.from(childrenOf(entry.node).entries()).reverse()
    for (const [index, child] of nested) {
      pending.push({ node: child, depth: entry.depth + 1, parentId: entry.node.id, index })
    }
  }
}

/** Pre-order, so a row is always preceded by the row it is nested inside. */
export const outlineTree = (root: LoomNode): readonly OutlineEntry[] =>
  Array.from(walkOutline(root))
