import type { NodeId } from "../ids.js"
import { assertNever } from "../result.js"

import type { TreeOperation } from "./delta.js"
import { collectNodeIds } from "./navigation.js"

/**
 * Which nodes a set of operations names, read from the operations alone.
 *
 * `ChangeAnalysis` already answers a richer version of this question, but it
 * needs the tree the delta applied to. Two deltas from different points in a
 * log cannot both be analysed against one tree, so asking whether they overlap
 * — which is what a revert has to know — needs an answer that depends on
 * nothing but the operations themselves.
 *
 * It is deliberately a *names* relation rather than an *affects* one. A `remove`
 * names one id and destroys a whole subtree; the subtree's ids are not in the
 * operation, so they are not reported. That under-reports, and it is the safe
 * direction: an operation that later depends on a node something else removed
 * fails in `applyDelta` rather than passing quietly. Over-reporting is the
 * direction that would be silent, so `insert` and `move` name their parent as
 * well as their subject.
 */

const namedByOperation = (operation: TreeOperation): readonly NodeId[] => {
  switch (operation.op) {
    case "insert":
      return [operation.parentId, ...collectNodeIds(operation.node)]
    case "remove":
      return [operation.nodeId]
    case "move":
      return [operation.nodeId, operation.parentId]
    case "configure":
      return [operation.nodeId]
    default:
      return assertNever(operation, "namedByOperation")
  }
}

export const namedNodeIds = (operations: readonly TreeOperation[]): readonly NodeId[] =>
  Array.from(new Set(operations.flatMap(namedByOperation)))
