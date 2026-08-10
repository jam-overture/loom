import type { NodeId } from "../ids.js"
import type { PrimitiveType } from "../primitive-type.js"
import { assertNever, err, ok, type Result } from "../result.js"
import { applyOperation } from "../tree/apply.js"
import type { TreeDelta, TreeOperation } from "../tree/delta.js"
import type { TreeError } from "../tree/errors.js"
import { findNode, pathToNode, walkTree } from "../tree/navigation.js"
import type { LoomNode } from "../tree/node.js"
import type { LoomTree } from "../tree/tree.js"

/**
 * Facts about what a delta does, extracted before anyone judges it.
 *
 * Analysis is deliberately separate from the Gate: this module knows what
 * changed and nothing about whether that is acceptable. Policy and judgment
 * live downstream, which means the Gate's rules can change without touching
 * how a change is measured.
 */

export type ChangeAnalysis = {
  readonly operationCount: number
  readonly insertedNodeCount: number
  readonly removedNodeCount: number
  /** Nodes a move operation named. The subtree each carried is counted separately. */
  readonly movedNodeCount: number
  readonly configuredNodeCount: number
  /**
   * Nodes a move carried, the node it named included. A move is the one
   * operation whose reach is larger than the node it names, and measuring it
   * that way is what makes the analysis independent of how the delta was
   * phrased: relocating a slot and relocating the card inside it are the same
   * physical change described two ways (0044).
   */
  readonly relocatedNodeCount: number
  /** Nodes directly touched. A move counts the node, not the subtree riding along. */
  readonly affectedNodeIds: readonly NodeId[]
  /**
   * Types this delta created, destroyed, or reconfigured. A move contributes
   * nothing here whichever node it names — a relocated node is not rewritten,
   * and `relocatedPrimitiveTypes` is where it is reported instead (0044).
   */
  readonly touchedPrimitiveTypes: readonly PrimitiveType[]
  /**
   * Types carried by a move, in the whole subtree rather than at its root. A
   * protected primitive travelling across the page is a fact the Gate has to
   * see, and it is not the same fact as one being rewritten.
   */
  readonly relocatedPrimitiveTypes: readonly PrimitiveType[]
  /**
   * Types destroyed outright, a subset of the touched types. Destroying a
   * primitive is a strictly bigger deal than reconfiguring one, so stakes need
   * to tell the two apart.
   */
  readonly removedPrimitiveTypes: readonly PrimitiveType[]
  readonly configuredPropKeys: readonly string[]
  /**
   * Distance from the root of the shallowest touched position, where the root
   * is 0. A change near the root restructures the page; a change deep in a leaf
   * usually does not.
   */
  readonly shallowestAffectedDepth: number
}

const elementTypesIn = (node: LoomNode): readonly PrimitiveType[] =>
  Array.from(walkTree(node)).flatMap((current) =>
    current.kind === "element" ? [current.type] : []
  )

const nodeCount = (node: LoomNode): number => Array.from(walkTree(node)).length

const depthOf = (root: LoomNode, nodeId: NodeId): number | null => {
  const path = pathToNode(root, nodeId)

  return path ? path.length - 1 : null
}

type Tally = {
  inserted: number
  removed: number
  moved: number
  relocated: number
  configured: number
  shallowest: number
  readonly affected: Set<NodeId>
  readonly types: Set<PrimitiveType>
  readonly removedTypes: Set<PrimitiveType>
  readonly relocatedTypes: Set<PrimitiveType>
  readonly propKeys: Set<string>
}

const emptyTally = (): Tally => ({
  inserted: 0,
  removed: 0,
  moved: 0,
  relocated: 0,
  configured: 0,
  shallowest: Number.POSITIVE_INFINITY,
  affected: new Set(),
  types: new Set(),
  removedTypes: new Set(),
  relocatedTypes: new Set(),
  propKeys: new Set(),
})

const noteDepth = (tally: Tally, depth: number | null): void => {
  if (depth !== null) tally.shallowest = Math.min(tally.shallowest, depth)
}

const noteSubtree = (tally: Tally, node: LoomNode): void => {
  for (const current of walkTree(node)) tally.affected.add(current.id)
  for (const type of elementTypesIn(node)) tally.types.add(type)
}

const tallyOperation = (
  tally: Tally,
  root: LoomNode,
  operation: TreeOperation
): Result<Tally, TreeError> => {
  switch (operation.op) {
    case "insert": {
      const parentDepth = depthOf(root, operation.parentId)
      if (parentDepth === null) return err({ code: "node-not-found", nodeId: operation.parentId })

      tally.inserted += nodeCount(operation.node)
      noteSubtree(tally, operation.node)
      noteDepth(tally, parentDepth + 1)

      return ok(tally)
    }

    case "remove": {
      const target = findNode(root, operation.nodeId)
      if (!target) return err({ code: "node-not-found", nodeId: operation.nodeId })

      tally.removed += nodeCount(target)
      noteSubtree(tally, target)
      for (const type of elementTypesIn(target)) tally.removedTypes.add(type)
      noteDepth(tally, depthOf(root, operation.nodeId))

      return ok(tally)
    }

    case "move": {
      const target = findNode(root, operation.nodeId)
      if (!target) return err({ code: "node-not-found", nodeId: operation.nodeId })

      const destinationDepth = depthOf(root, operation.parentId)
      if (destinationDepth === null) return err({ code: "node-not-found", nodeId: operation.parentId })

      tally.moved += 1
      tally.relocated += nodeCount(target)
      tally.affected.add(operation.nodeId)
      for (const type of elementTypesIn(target)) tally.relocatedTypes.add(type)
      noteDepth(tally, depthOf(root, operation.nodeId))
      noteDepth(tally, destinationDepth + 1)

      return ok(tally)
    }

    case "configure": {
      const target = findNode(root, operation.nodeId)
      if (!target) return err({ code: "node-not-found", nodeId: operation.nodeId })

      tally.configured += 1
      tally.affected.add(operation.nodeId)
      if (target.kind === "element") tally.types.add(target.type)
      for (const key of [...Object.keys(operation.set), ...operation.unset]) {
        tally.propKeys.add(key)
      }
      noteDepth(tally, depthOf(root, operation.nodeId))

      return ok(tally)
    }

    default:
      return assertNever(operation, "tallyOperation")
  }
}

/**
 * Walks the delta forward so each operation is measured against the tree it
 * actually observes — an operation may target a node an earlier operation in
 * the same delta inserted.
 */
export const analyzeDelta = (
  tree: LoomTree,
  delta: TreeDelta
): Result<ChangeAnalysis, TreeError> => {
  const tally = emptyTally()
  let state: LoomNode = tree.root

  for (const operation of delta.operations) {
    const tallied = tallyOperation(tally, state, operation)
    if (!tallied.ok) return tallied

    const advanced = applyOperation(state, operation)
    if (!advanced.ok) return advanced

    state = advanced.value
  }

  return ok({
    operationCount: delta.operations.length,
    insertedNodeCount: tally.inserted,
    removedNodeCount: tally.removed,
    movedNodeCount: tally.moved,
    configuredNodeCount: tally.configured,
    relocatedNodeCount: tally.relocated,
    affectedNodeIds: Array.from(tally.affected),
    touchedPrimitiveTypes: Array.from(tally.types),
    removedPrimitiveTypes: Array.from(tally.removedTypes),
    relocatedPrimitiveTypes: Array.from(tally.relocatedTypes),
    configuredPropKeys: Array.from(tally.propKeys),
    shallowestAffectedDepth: Number.isFinite(tally.shallowest) ? tally.shallowest : 0,
  })
}
