import type { NodeId, TreeDelta, TreeOperation } from "@loom/runtime"

/**
 * Which nodes a change is about, so a surface can point at them.
 *
 * The record already says what a change did, in the runtime's own words —
 * `remove demo-n17`, `configure demo-n3: backdrop`. That is exact and it is
 * unreadable, and worse, it is on the *rail* while the thing it describes is on
 * the *stage*. A visitor pressed a button, four hundred pixels of page they
 * could not see moved, and the only account of it was a node id.
 *
 * So this is the same delta read for a different question: not *what happened*
 * but *where*. It is a projection of operations that already exist — nothing is
 * computed for display and nothing is guessed — and it is deliberately not the
 * `describeOperation` strings parsed back out, because a sentence is written for
 * a reader and a node id is written for a machine, and only one of them survives
 * a copy-edit.
 */

export type TouchKind = "added" | "removed" | "moved" | "changed"

export type TouchedNode = {
  readonly kind: TouchKind
  /**
   * The node the operation named.
   *
   * It is in the resulting tree for every kind but `removed` — and it is *not*
   * in the tree the visitor is looking at when the change is still waiting on
   * them, because an `added` node does not exist until the change applies. Both
   * of those are why `parentId` and `index` are here.
   */
  readonly nodeId: NodeId
  /** Where the node belongs, when there is no node in the tree to point at. */
  readonly parentId?: NodeId
  readonly index?: number
}

/**
 * The inverse of a `remove` is an `insert` of the same node, which is the only
 * place the parent and position of a removed node survive. `assessReversibility`
 * computes it whether or not anybody undoes anything, so this costs nothing.
 */
const whereItWas = (nodeId: NodeId, inverse: readonly TreeOperation[]): Pick<TouchedNode, "parentId" | "index"> => {
  const restoring = inverse.find(
    (operation) => operation.op === "insert" && operation.node.id === nodeId
  )

  return restoring?.op === "insert" ? { parentId: restoring.parentId, index: restoring.index } : {}
}

const touchOf = (operation: TreeOperation, inverse: readonly TreeOperation[]): TouchedNode => {
  switch (operation.op) {
    case "insert":
      return {
        kind: "added",
        nodeId: operation.node.id,
        parentId: operation.parentId,
        index: operation.index,
      }
    case "remove":
      return { kind: "removed", nodeId: operation.nodeId, ...whereItWas(operation.nodeId, inverse) }
    case "move":
      return {
        kind: "moved",
        nodeId: operation.nodeId,
        parentId: operation.parentId,
        index: operation.index,
      }
    case "configure":
      return { kind: "changed", nodeId: operation.nodeId }
  }
}

/**
 * What this delta is about, in the order the operations were proposed.
 *
 * `inverse` is optional because a surface may want this for a delta nobody has
 * assessed. Without it a removed node has no position, which costs a caller the
 * ability to point at the gap and nothing else.
 */
export const touchedBy = (delta: TreeDelta, inverse?: TreeDelta): readonly TouchedNode[] =>
  delta.operations.map((operation) => touchOf(operation, inverse?.operations ?? []))
