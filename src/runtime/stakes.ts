import type { ChangeAnalysis } from "./analysis.js"
import type { GatePolicy } from "./policy.js"
import type { DiscardedWork } from "./proposal.js"
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
 *
 * Every factor but one is a fact about the delta against the tree. The
 * exception, `discards-later-work`, is a fact about the log the delta was
 * computed from, which no amount of looking at the delta can recover (0035).
 */

export type StakeFactorCode =
  | "protected-type-removed"
  | "protected-type-touched"
  | "protected-type-relocated"
  | "protected-prop-configured"
  | "large-removal"
  | "broad-change"
  | "shallow-structural-change"
  | "discards-later-work"

export type StakeFactor = {
  readonly code: StakeFactorCode
  readonly level: StakeLevel
  readonly detail: string
}

export type StakeAssessment = {
  readonly level: StakeLevel
  readonly factors: readonly StakeFactor[]
}

/**
 * Everything the damage estimate is computed from: what the delta does, and
 * what its author declared it writes over.
 *
 * A record rather than a trailing argument, for the reason `Commit.answeredBy`
 * gives: an input that can be left off the end is one that will be, and leaving
 * this one off silently lowers the stakes of a change that discards work.
 */
export type StakeInput = {
  readonly analysis: ChangeAnalysis
  /** Empty when the proposal declared nothing, which is not the same as nothing. */
  readonly discards: readonly DiscardedWork[]
}

const intersect = <TValue>(
  candidates: readonly TValue[],
  declared: readonly TValue[]
): readonly TValue[] => candidates.filter((candidate) => declared.includes(candidate))

/** Destroying a protected primitive outranks merely reconfiguring one. */
const protectedTypeRemoved = ({ analysis }: StakeInput, policy: GatePolicy): StakeFactor | null => {
  const matches = intersect(analysis.removedPrimitiveTypes, policy.protectedPrimitiveTypes)
  if (matches.length === 0) return null

  return {
    code: "protected-type-removed",
    level: "critical",
    detail: `destroys protected ${matches.join(", ")}`,
  }
}

const protectedTypeTouched = ({ analysis }: StakeInput, policy: GatePolicy): StakeFactor | null => {
  const matches = intersect(analysis.touchedPrimitiveTypes, policy.protectedPrimitiveTypes)
  if (matches.length === 0) return null

  return {
    code: "protected-type-touched",
    level: "high",
    detail: `touches protected ${matches.join(", ")}`,
  }
}

/**
 * Moving a protected primitive ranks with rewriting one, not with destroying
 * one: the node survives intact and the position is what changed. It is a
 * separate factor rather than a wider reading of `protected-type-touched`
 * because the two sentences a reviewer needs are different — one says the card
 * was rewritten, the other says it is somewhere else now (0044).
 */
const protectedTypeRelocated = (
  { analysis }: StakeInput,
  policy: GatePolicy
): StakeFactor | null => {
  const matches = intersect(analysis.relocatedPrimitiveTypes, policy.protectedPrimitiveTypes)
  if (matches.length === 0) return null

  return {
    code: "protected-type-relocated",
    level: "high",
    detail: `relocates protected ${matches.join(", ")}`,
  }
}

const protectedProp = ({ analysis }: StakeInput, policy: GatePolicy): StakeFactor | null => {
  const matches = intersect(analysis.configuredPropKeys, policy.protectedPropKeys)
  if (matches.length === 0) return null

  return {
    code: "protected-prop-configured",
    level: "high",
    detail: `configures protected ${matches.join(", ")}`,
  }
}

const largeRemoval = ({ analysis }: StakeInput, policy: GatePolicy): StakeFactor | null => {
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

const broadChange = ({ analysis }: StakeInput, policy: GatePolicy): StakeFactor | null => {
  const touched = analysis.affectedNodeIds.length
  if (touched < policy.breadthThreshold) return null

  return { code: "broad-change", level: "medium", detail: `touches ${touched} nodes` }
}

const isStructural = (analysis: ChangeAnalysis): boolean =>
  analysis.insertedNodeCount + analysis.removedNodeCount + analysis.movedNodeCount > 0

const shallowStructuralChange = (
  { analysis }: StakeInput,
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

/**
 * Work this change writes over, as damage.
 *
 * `high` and not `critical`: critical is where the refusal floor sits by
 * default, and a change that discards work is one a person should be allowed to
 * decide about rather than one nobody may make. A host that disagrees lowers its
 * refusal floor to `high` and gets a refusal, which is the composition 0002
 * asks for instead of a second knob.
 *
 * Host-independent, so there is no vocabulary knob: whether a revision counts as
 * work does not depend on which primitives a deployment cares about.
 */
const discardsLaterWork = ({ discards }: StakeInput): StakeFactor | null => {
  if (discards.length === 0) return null

  const revisions = discards.map((discarded) => discarded.revision)
  const nodes = new Set(discards.flatMap((discarded) => discarded.nodeIds))

  return {
    code: "discards-later-work",
    level: "high",
    detail: `discards work from revision${revisions.length === 1 ? "" : "s"} ${revisions.join(
      ", "
    )} at ${nodes.size} node${nodes.size === 1 ? "" : "s"}`,
  }
}

const FACTORS: readonly ((input: StakeInput, policy: GatePolicy) => StakeFactor | null)[] = [
  protectedTypeRemoved,
  protectedTypeTouched,
  protectedTypeRelocated,
  protectedProp,
  largeRemoval,
  broadChange,
  shallowStructuralChange,
  discardsLaterWork,
]

export const assessStakes = (input: StakeInput, policy: GatePolicy): StakeAssessment => {
  const factors = FACTORS.flatMap((factor) => factor(input, policy) ?? [])

  return { level: highestStake(factors.map((factor) => factor.level)), factors }
}

/** The factor with this code, for a caller that needs the reason and not the level. */
export const stakeFactor = (
  stakes: StakeAssessment,
  code: StakeFactorCode
): StakeFactor | undefined => stakes.factors.find((factor) => factor.code === code)
