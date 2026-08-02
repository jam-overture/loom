import type { DeltaId, NodeId } from "../ids.js"
import type { JsonObject, JsonValue } from "../json.js"
import { assertNever, err, mapResult, ok, type Result } from "../result.js"

import { applyOperation } from "./apply.js"
import { configurationOf } from "./configuration.js"
import type { TreeDelta, TreeOperation } from "./delta.js"
import type { TreeError } from "./errors.js"
import { childrenOf, type LoomNode } from "./node.js"
import { findNode, findParent } from "./navigation.js"
import type { LoomTree } from "./tree.js"

/**
 * Inverse deltas.
 *
 * Every operation has an exact inverse, so undo is a delta rather than a
 * snapshot. This is also what makes reversibility a computable property: the
 * Gate does not guess whether a change can be taken back, it is handed the
 * delta that takes it back.
 *
 * The inverse of an operation depends on the state that operation observed, so
 * inversion walks the delta forward — inverting each operation against the tree
 * as it stood at that point — and then reverses the resulting order.
 */

const indexOfChild = (parent: LoomNode, nodeId: NodeId): number =>
  childrenOf(parent).findIndex((child) => child.id === nodeId)

const invertRemove = (root: LoomNode, nodeId: NodeId): Result<TreeOperation, TreeError> => {
  const removed = findNode(root, nodeId)
  if (!removed) return err({ code: "node-not-found", nodeId })

  const parent = findParent(root, nodeId)
  if (!parent) return err({ code: "root-not-detachable", nodeId })

  return ok({ op: "insert", parentId: parent.id, index: indexOfChild(parent, nodeId), node: removed })
}

/**
 * A move is detach-then-insert, so its inverse restores the original index in
 * the original parent's child list minus the node — which is exactly the list
 * the inverse move sees once it has detached the node from where it went.
 */
const invertMove = (root: LoomNode, nodeId: NodeId): Result<TreeOperation, TreeError> => {
  const parent = findParent(root, nodeId)
  if (!parent) {
    return findNode(root, nodeId)
      ? err({ code: "root-not-detachable", nodeId })
      : err({ code: "node-not-found", nodeId })
  }

  return ok({ op: "move", nodeId, parentId: parent.id, index: indexOfChild(parent, nodeId) })
}

/**
 * Restores whatever the touched keys held before: keys that existed are set
 * back to their prior values, keys that did not are unset again.
 */
const invertConfigure = (
  root: LoomNode,
  nodeId: NodeId,
  set: JsonObject,
  unset: readonly string[]
): Result<TreeOperation, TreeError> => {
  const node = findNode(root, nodeId)
  if (!node) return err({ code: "node-not-found", nodeId })

  const previous = configurationOf(node)
  const touchedKeys = new Set([...Object.keys(set), ...unset])

  const restored: Record<string, JsonValue> = {}
  const cleared: string[] = []

  for (const key of touchedKeys) {
    const priorValue = previous[key]
    if (priorValue === undefined) cleared.push(key)
    else restored[key] = priorValue
  }

  return ok({ op: "configure", nodeId, set: restored, unset: cleared })
}

export const invertOperation = (
  root: LoomNode,
  operation: TreeOperation
): Result<TreeOperation, TreeError> => {
  switch (operation.op) {
    case "insert":
      return ok({ op: "remove", nodeId: operation.node.id })
    case "remove":
      return invertRemove(root, operation.nodeId)
    case "move":
      return invertMove(root, operation.nodeId)
    case "configure":
      return invertConfigure(root, operation.nodeId, operation.set, operation.unset)
    default:
      return assertNever(operation, "invertOperation")
  }
}

/**
 * The operations that undo `delta`, without deciding which revision they apply
 * to. Fails for the same reasons applying `delta` would fail, so a successful
 * inversion also proves the original delta is applicable.
 *
 * Separate from `invertDelta` because an undo is not always applied where it
 * was computed: reverting a revision from the log inverts against the tree that
 * revision observed, then applies the result at head. Only the operations
 * survive that journey — the id and the base revision belong to whichever delta
 * eventually carries them.
 */
export const invertOperations = (
  tree: LoomTree,
  delta: TreeDelta
): Result<readonly TreeOperation[], TreeError> => {
  let state: LoomNode = tree.root
  const inverted: TreeOperation[] = []

  for (const operation of delta.operations) {
    const inverse = invertOperation(state, operation)
    if (!inverse.ok) return inverse

    const advanced = applyOperation(state, operation)
    if (!advanced.ok) return advanced

    inverted.unshift(inverse.value)
    state = advanced.value
  }

  return ok(inverted)
}

/**
 * The delta that undoes `delta`, targeting the revision `delta` produces.
 */
export const invertDelta = (
  tree: LoomTree,
  delta: TreeDelta,
  inverseDeltaId: DeltaId
): Result<TreeDelta, TreeError> =>
  mapResult(invertOperations(tree, delta), (operations) => ({
    deltaId: inverseDeltaId,
    treeId: tree.treeId,
    baseRevision: tree.revision + 1,
    operations,
  }))
