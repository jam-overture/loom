import type { ChangeAnalysis } from "./analysis.js"
import type { GatePolicy } from "./policy.js"
import { highestStake, type StakeLevel } from "./stake-level.js"

/**
 * Stakes assessment: facts plus policy in, a level plus its reasons out.
 *
 * Every factor is recorded rather than collapsed, so a disposition can explain
 * itself. "High stakes" is not useful feedback; "this removes 14 nodes and
 * touches commerce.checkout" is.
 *
 * Stakes measure damage only. Whether a change can be taken back is a separate
 * axis assessed separately — a change can be devastating and trivially
 * reversible, or tiny and permanent, and the Gate needs to see those two
 * properties independently rather than pre-blended into one number.
 */

export type StakeFactorCode =
  | "protected-type-removed"
  | "protected-type-touched"
  | "protected-prop-configured"
  | "large-removal"
  | "broad-change"
  | "shallow-structural-change"

export type StakeFactor = {
  readonly code: StakeFactorCode
  readonly level: StakeLevel
  readonly detail: string
}

export type StakeAssessment = {
  readonly level: StakeLevel
  readonly factors: readonly StakeFactor[]
}

const intersect = <TValue>(
  candidates: readonly TValue[],
  declared: readonly TValue[]
): readonly TValue[] => candidates.filter((candidate) => declared.includes(candidate))

/** Destroying a protected primitive outranks merely reconfiguring one. */
const protectedTypeRemoved = (analysis: ChangeAnalysis, policy: GatePolicy): StakeFactor | null => {
  const matches = intersect(analysis.removedPrimitiveTypes, policy.protectedPrimitiveTypes)
  if (matches.length === 0) return null

  return {
    code: "protected-type-removed",
    level: "critical",
    detail: `destroys protected ${matches.join(", ")}`,
  }
}

const protectedTypeTouched = (analysis: ChangeAnalysis, policy: GatePolicy): StakeFactor | null => {
  const matches = intersect(analysis.touchedPrimitiveTypes, policy.protectedPrimitiveTypes)
  if (matches.length === 0) return null

  return {
    code: "protected-type-touched",
    level: "high",
    detail: `touches protected ${matches.join(", ")}`,
  }
}

const protectedProp = (analysis: ChangeAnalysis, policy: GatePolicy): StakeFactor | null => {
  const matches = intersect(analysis.configuredPropKeys, policy.protectedPropKeys)
  if (matches.length === 0) return null

  return {
    code: "protected-prop-configured",
    level: "high",
    detail: `configures protected ${matches.join(", ")}`,
  }
}

const largeRemoval = (analysis: ChangeAnalysis, policy: GatePolicy): StakeFactor | null => {
  const { removedNodeCount } = analysis
  const { removalThresholds } = policy

  if (removedNodeCount >= removalThresholds.high) {
    return {
      code: "large-removal",
      level: "high",
      detail: `removes ${removedNodeCount} nodes`,
    }
  }

  if (removedNodeCount >= removalThresholds.medium) {
    return {
      code: "large-removal",
      level: "medium",
      detail: `removes ${removedNodeCount} nodes`,
    }
  }

  return null
}

const broadChange = (analysis: ChangeAnalysis, policy: GatePolicy): StakeFactor | null => {
  const touched = analysis.affectedNodeIds.length
  if (touched < policy.breadthThreshold) return null

  return { code: "broad-change", level: "medium", detail: `touches ${touched} nodes` }
}

const isStructural = (analysis: ChangeAnalysis): boolean =>
  analysis.insertedNodeCount + analysis.removedNodeCount + analysis.movedNodeCount > 0

const shallowStructuralChange = (
  analysis: ChangeAnalysis,
  policy: GatePolicy
): StakeFactor | null => {
  if (!isStructural(analysis)) return null
  if (analysis.shallowestAffectedDepth > policy.shallowDepthThreshold) return null

  return {
    code: "shallow-structural-change",
    level: "medium",
    detail: `restructures at depth ${analysis.shallowestAffectedDepth}`,
  }
}

const FACTORS: readonly ((
  analysis: ChangeAnalysis,
  policy: GatePolicy
) => StakeFactor | null)[] = [
  protectedTypeRemoved,
  protectedTypeTouched,
  protectedProp,
  largeRemoval,
  broadChange,
  shallowStructuralChange,
]

export const assessStakes = (analysis: ChangeAnalysis, policy: GatePolicy): StakeAssessment => {
  const factors = FACTORS.flatMap((factor) => factor(analysis, policy) ?? [])

  return { level: highestStake(factors.map((factor) => factor.level)), factors }
}
