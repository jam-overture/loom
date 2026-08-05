import type { NodeId } from "../ids.js"
import { assertNever, err, flatMapResult, mapResult, ok, reduceResult, type Result } from "../result.js"

import { configureNode } from "./configuration.js"
import type { TreeDelta, TreeOperation } from "./delta.js"
import type { TreeError } from "./errors.js"
import { nodeFingerprint } from "./identity.js"
import { detachNode, insertChild, replaceNode } from "./mutation.js"
import { collectNodeIds, duplicateNodeIds, isDescendantOf, walkTree } from "./navigation.js"
import type { ElementNode, LoomNode } from "./node.js"
import { withRoot, type LoomTree } from "./tree.js"

/**
 * Delta application. Pure: a tree and a delta go in, a new tree or a TreeError
 * comes out. Nothing here logs, persists, or emits — the composition runtime
 * wraps this function with those concerns so that the structural rules stay
 * testable in isolation.
 */

/**
 * The tree as the delta has left it so far, plus the ids this delta has already
 * removed and the shape they had when they went.
 *
 * Id uniqueness on its own is not enough to keep an id meaning one node (0038).
 * A `remove` takes an id out of the live tree, so a later `insert` in the same
 * delta can mint a fresh node onto it and pass every check. The retired set is
 * what closes that within one delta; across a log it is the audit's job, because
 * enforcing it there would need state the tree does not carry.
 */
type Applying = {
  readonly root: LoomNode
  readonly retired: ReadonlyMap<NodeId, string>
}

const withRetired = (
  applied: Result<LoomNode, TreeError>,
  retired: ReadonlyMap<NodeId, string>
): Result<Applying, TreeError> => mapResult(applied, (root) => ({ root, retired }))

const rejectIdCollisions = (root: LoomNode, incoming: LoomNode): Result<LoomNode, TreeError> => {
  const [internalDuplicate] = duplicateNodeIds(incoming)
  if (internalDuplicate) return err({ code: "duplicate-node-id", nodeId: internalDuplicate })

  const existing = new Set(collectNodeIds(root))
  const collision = collectNodeIds(incoming).find((nodeId) => existing.has(nodeId))
  if (collision) return err({ code: "duplicate-node-id", nodeId: collision })

  return ok(incoming)
}

/**
 * An id this delta retired may come back, but only as the node that left. That
 * is what an undo of a `remove` does — it re-inserts the exact subtree — and
 * refusing it would refuse taking a removal back.
 */
const rejectRecycling = (
  retired: ReadonlyMap<NodeId, string>,
  incoming: LoomNode
): Result<LoomNode, TreeError> => {
  const recycled = Array.from(walkTree(incoming)).find((node) => {
    const departed = retired.get(node.id)

    return departed !== undefined && departed !== nodeFingerprint(node)
  })

  return recycled ? err({ code: "recycled-node-id", nodeId: recycled.id }) : ok(incoming)
}

const applyInsert = (
  state: Applying,
  operation: Extract<TreeOperation, { op: "insert" }>
): Result<Applying, TreeError> =>
  withRetired(
    flatMapResult(rejectRecycling(state.retired, operation.node), (node) =>
      flatMapResult(rejectIdCollisions(state.root, node), (checked) =>
        insertChild(state.root, operation.parentId, operation.index, checked)
      )
    ),
    state.retired
  )

const retire = (
  retired: ReadonlyMap<NodeId, string>,
  detached: LoomNode
): ReadonlyMap<NodeId, string> =>
  new Map([
    ...retired,
    ...Array.from(walkTree(detached), (node) => [node.id, nodeFingerprint(node)] as const),
  ])

const applyRemove = (
  state: Applying,
  operation: Extract<TreeOperation, { op: "remove" }>
): Result<Applying, TreeError> =>
  mapResult(detachNode(state.root, operation.nodeId), (detached) => ({
    root: detached.root,
    retired: retire(state.retired, detached.detached),
  }))

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

const advance = (state: Applying, operation: TreeOperation): Result<Applying, TreeError> => {
  switch (operation.op) {
    case "insert":
      return applyInsert(state, operation)
    case "remove":
      return applyRemove(state, operation)
    case "move":
      return withRetired(applyMove(state.root, operation), state.retired)
    case "configure":
      return withRetired(applyConfigure(state.root, operation), state.retired)
    default:
      return assertNever(operation, "advance")
  }
}

const NOTHING_RETIRED: ReadonlyMap<NodeId, string> = new Map()

/**
 * One operation against one tree, with no delta around it.
 *
 * An operation applied on its own has retired nothing, so the recycling rule
 * cannot fire here — it is a rule about what a *delta* may do to an id it
 * removed. `invertOperations` walks operations this way, and inverting a delta
 * must never be stricter than applying one.
 */
export const applyOperation = (
  root: LoomNode,
  operation: TreeOperation
): Result<LoomNode, TreeError> =>
  mapResult(advance({ root, retired: NOTHING_RETIRED }, operation), (state) => state.root)

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

  const applied = reduceResult<TreeOperation, Applying, TreeError>(
    delta.operations,
    { root: tree.root, retired: NOTHING_RETIRED },
    advance
  )

  return mapResult(
    flatMapResult(
      mapResult(applied, (state) => state.root),
      requireElementRoot
    ),
    (root) => withRoot(tree, root)
  )
}
