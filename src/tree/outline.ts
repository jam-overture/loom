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

function* walkOutline(
  node: LoomNode,
  depth: number,
  parentId: NodeId | null,
  index: number
): Generator<OutlineEntry> {
  yield { node, depth, parentId, index }

  for (const [childIndex, child] of childrenOf(node).entries()) {
    yield* walkOutline(child, depth + 1, node.id, childIndex)
  }
}

/** Pre-order, so a row is always preceded by the row it is nested inside. */
export const outlineTree = (root: LoomNode): readonly OutlineEntry[] =>
  Array.from(walkOutline(root, 0, null, 0))
