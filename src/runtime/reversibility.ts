import type { DeltaId } from "../ids.js"
import type { PrimitiveType } from "../primitive-type.js"
import { mapResult, type Result } from "../result.js"
import type { TreeDelta } from "../tree/delta.js"
import type { TreeError } from "../tree/errors.js"
import { invertDelta } from "../tree/inverse.js"
import type { LoomTree } from "../tree/tree.js"

import type { ChangeAnalysis } from "./analysis.js"
import type { GatePolicy } from "./policy.js"

/**
 * Reversibility is computed, not guessed: the inverse delta is produced up
 * front, so "can this be undone" is answered by handing over the thing that
 * undoes it.
 *
 * At tree level an inverse always exists. What makes a change *irreversible* is
 * either that undoing the tree would not undo reality — a primitive whose
 * configuration reaches a payment flow or a sent message — or that the inverse
 * would have to retain more content than the runtime is willing to hold.
 */

export type IrreversibilityReason =
  | { readonly code: "out-of-tree-effect"; readonly primitiveTypes: readonly PrimitiveType[] }
  | {
      readonly code: "retention-budget-exceeded"
      readonly retainedNodeCount: number
      readonly budget: number
    }

export type Reversibility = {
  readonly reversible: boolean
  /** The tree-level undo. Present even when `reversible` is false. */
  readonly inverse: TreeDelta
  /** Nodes the inverse must carry — the content a removal destroyed. */
  readonly retainedNodeCount: number
  readonly reasons: readonly IrreversibilityReason[]
}

const irreversibilityReasons = (
  analysis: ChangeAnalysis,
  policy: GatePolicy
): readonly IrreversibilityReason[] => {
  /**
   * Relocated types count here as well as touched ones. Whether moving a live
   * payment flow fires anything outside the tree is genuinely open, and
   * phrasing must not decide it: before 0044 a move that named the checkout was
   * irreversible and one that named its parent was not. Where
   * phrasing-independence forces a single answer, this takes the conservative
   * one — a change wrongly called irreversible is offered for confirmation, and
   * one wrongly called reversible is applied.
   */
  const outOfTree = [...analysis.touchedPrimitiveTypes, ...analysis.relocatedPrimitiveTypes].filter(
    (type, index, types) =>
      types.indexOf(type) === index && policy.outOfTreeEffectTypes.includes(type)
  )

  const overBudget = analysis.removedNodeCount > policy.inverseRetentionBudget

  return [
    ...(outOfTree.length > 0
      ? [{ code: "out-of-tree-effect" as const, primitiveTypes: outOfTree }]
      : []),
    ...(overBudget
      ? [
          {
            code: "retention-budget-exceeded" as const,
            retainedNodeCount: analysis.removedNodeCount,
            budget: policy.inverseRetentionBudget,
          },
        ]
      : []),
  ]
}

export const assessReversibility = (
  tree: LoomTree,
  delta: TreeDelta,
  analysis: ChangeAnalysis,
  policy: GatePolicy,
  inverseDeltaId: DeltaId
): Result<Reversibility, TreeError> =>
  mapResult(invertDelta(tree, delta, inverseDeltaId), (inverse) => {
    const reasons = irreversibilityReasons(analysis, policy)

    return {
      reversible: reasons.length === 0,
      inverse,
      retainedNodeCount: analysis.removedNodeCount,
      reasons,
    }
  })
