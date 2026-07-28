import { assertNever, err, flatMapResult, mapResult, ok, reduceResult, type Result } from "../result.js"

import { configureNode } from "./configuration.js"
import type { TreeDelta, TreeOperation } from "./delta.js"
import type { TreeError } from "./errors.js"
import { detachNode, insertChild, replaceNode } from "./mutation.js"
import { collectNodeIds, duplicateNodeIds, isDescendantOf } from "./navigation.js"
import type { ElementNode, LoomNode } from "./node.js"
import { withRoot, type LoomTree } from "./tree.js"

/**
 * Delta application. Pure: a tree and a delta go in, a new tree or a TreeError
 * comes out. Nothing here logs, persists, or emits — the composition runtime
 * wraps this function with those concerns so that the structural rules stay
 * testable in isolation.
 */

const rejectIdCollisions = (root: LoomNode, incoming: LoomNode): Result<LoomNode, TreeError> => {
  const [internalDuplicate] = duplicateNodeIds(incoming)
  if (internalDuplicate) return err({ code: "duplicate-node-id", nodeId: internalDuplicate })

  const existing = new Set(collectNodeIds(root))
  const collision = collectNodeIds(incoming).find((nodeId) => existing.has(nodeId))
  if (collision) return err({ code: "duplicate-node-id", nodeId: collision })

  return ok(incoming)
}

const applyInsert = (
  root: LoomNode,
  operation: Extract<TreeOperation, { op: "insert" }>
): Result<LoomNode, TreeError> =>
  flatMapResult(rejectIdCollisions(root, operation.node), (node) =>
    insertChild(root, operation.parentId, operation.index, node)
  )

const applyRemove = (
  root: LoomNode,
  operation: Extract<TreeOperation, { op: "remove" }>
): Result<LoomNode, TreeError> =>
  mapResult(detachNode(root, operation.nodeId), (detached) => detached.root)

/**
 * A move is a detach followed by an insert, so `index` is interpreted against
 * the child list the node has already left. Reordering within one parent is
 * therefore expressed in post-removal coordinates: moving the first of three
 * siblings to the end is index 2, not 3.
 */
const applyMove = (
  root: LoomNode,
  operation: Extract<TreeOperation, { op: "move" }>
): Result<LoomNode, TreeError> => {
  if (root.id === operation.nodeId) {
    return err({ code: "root-not-detachable", nodeId: operation.nodeId })
  }

  if (operation.nodeId === operation.parentId) {
    return err({ code: "move-into-self", nodeId: operation.nodeId })
  }

  if (isDescendantOf(root, operation.nodeId, operation.parentId)) {
    return err({
      code: "move-into-descendant",
      nodeId: operation.nodeId,
      parentId: operation.parentId,
    })
  }

  return flatMapResult(detachNode(root, operation.nodeId), (detached) =>
    insertChild(detached.root, operation.parentId, operation.index, detached.detached)
  )
}

const applyConfigure = (
  root: LoomNode,
  operation: Extract<TreeOperation, { op: "configure" }>
): Result<LoomNode, TreeError> =>
  replaceNode(root, operation.nodeId, (node) =>
    configureNode(node, { set: operation.set, unset: operation.unset })
  )

export const applyOperation = (
  root: LoomNode,
  operation: TreeOperation
): Result<LoomNode, TreeError> => {
  switch (operation.op) {
    case "insert":
      return applyInsert(root, operation)
    case "remove":
      return applyRemove(root, operation)
    case "move":
      return applyMove(root, operation)
    case "configure":
      return applyConfigure(root, operation)
    default:
      return assertNever(operation, "applyOperation")
  }
}

/**
 * The root cannot be removed or moved, and `configure` never changes a node's
 * kind, so this narrowing always succeeds. It is checked rather than cast so
 * that a future operation cannot quietly violate the invariant.
 */
const requireElementRoot = (node: LoomNode): Result<ElementNode, TreeError> =>
  node.kind === "element"
    ? ok(node)
    : err({ code: "schema-violation", path: "root", detail: `root became a ${node.kind} node` })

export const applyDelta = (tree: LoomTree, delta: TreeDelta): Result<LoomTree, TreeError> => {
  if (delta.treeId !== tree.treeId) {
    return err({ code: "tree-mismatch", expected: delta.treeId, actual: tree.treeId })
  }

  if (delta.baseRevision !== tree.revision) {
    return err({ code: "revision-mismatch", expected: delta.baseRevision, actual: tree.revision })
  }

  const applied = reduceResult(delta.operations, tree.root as LoomNode, applyOperation)

  return mapResult(flatMapResult(applied, requireElementRoot), (root) => withRoot(tree, root))
}
