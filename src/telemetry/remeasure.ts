import {
  FIXED_STAKE_FACTOR_CODES,
  fixedStakeLevel,
  highestStake,
  isFixedStakeFactor,
  measureStakes,
  type GatePolicy,
  type StakeFactorCode,
  type StakeLevel,
  type StakeMeasurement,
} from "../runtime/index.js"

import type { AssessmentSummary } from "./event.js"

/**
 * What these stakes would have been, under a policy that was not in force.
 *
 * ## The question, and why only a record can answer it
 *
 * A host that wants to change its Gate policy has one thing worth consulting:
 * the changes it really judged. `/portal/rules/what-if` replays the eight rungs
 * of the escalation ladder against an edited policy and reproduces every recorded
 * verdict before it is believed — but only seven of a policy's seventeen fields
 * could be moved, because the other ten move the **measurement** and the
 * measurement was a function of a page as it stood that day. The level was
 * recorded; how it was arrived at was not.
 *
 * `remeasureStakes` is the missing half. It takes a journalled
 * `AssessmentSummary` and a policy, re-runs the Gate's own measuring rules
 * against it, and says what the stakes would have been.
 *
 * ## It is the Gate's rules, not a copy of them
 *
 * The seven policy-dependent rules are `measureStakes`, exactly as
 * `assessStakes` runs them, against a `StakeMeasurement` this module assembles
 * from the record instead of from a delta. Nothing here knows what a large
 * removal is. A simulation that reimplemented the thresholds would be confidently
 * wrong about the one subject a person came to it to be sure of, and it would go
 * wrong silently, months after the copy was made.
 *
 * The other seven rules — an unreachable target, an unregistered type, props a
 * primitive refuses, a question nothing reads, a redirected form, a repointed
 * region, discarded work — cannot be re-run at all, because each reads a list of
 * specifics that names parts of a particular page and does not cross the
 * telemetry boundary (0023). They do not need to be: no field of a policy moves
 * them, so the recorded code is the whole of the answer and `fixedStakeLevel`
 * turns it back into a level. Those come back `source: "recorded"`.
 *
 * ## What it refuses to guess
 *
 * Four of the fields this needs are optional on the record, because 0045 says a
 * telemetry field added after records exist is optional and never defaulted. So
 * an older record may genuinely not say whether a protected prop was configured.
 * **Defaulting that to "no" would silently lower the stakes of exactly the
 * changes an operator is asking about**, and the answer would look like a result.
 *
 * Instead the rule is named in `unreadable` and left out of the level, which
 * makes `level` a floor rather than an answer — the true stakes are that level or
 * higher. A caller showing a figure to a person must say so, or set the row
 * aside; `/portal/rules/what-if` already sets aside every change it cannot
 * reproduce, and this is the same discipline one step earlier.
 *
 * A rule is only unreadable when the policy would actually have consulted the
 * missing field. A host with nothing protected is not asking about protected
 * types, and a record whose change removed nothing cannot have removed a
 * protected type whatever it failed to write down — so the common case, an
 * ordinary record under an ordinary policy, is readable in full.
 */

/** One rule's contribution, and whether it was run again or taken as it stood. */
export type RemeasuredFactor = {
  readonly code: StakeFactorCode
  readonly level: StakeLevel
  /**
   * `remeasured` — this rule was run against the policy given here.
   * `recorded` — no field of a policy can move it, so its code is its level.
   */
  readonly source: "remeasured" | "recorded"
}

export type RemeasuredStakes = {
  /** A floor, not an answer, whenever `unreadable` is not empty. */
  readonly level: StakeLevel
  readonly factors: readonly RemeasuredFactor[]
  /**
   * Rules this record cannot answer under this policy, because a field they read
   * was not written down. Empty is the claim that `level` is exact.
   */
  readonly unreadable: readonly StakeFactorCode[]
}

/**
 * The largest `affectedNodeIds` could have been, from counts every record
 * carries.
 *
 * Breadth is the one measuring rule whose input is a length, and a record
 * written before `affectedNodeCount` existed does not carry it. It is still
 * bounded: an insert or a remove contributes its whole subtree to both the
 * affected set and its own node count, a move and a configure contribute one
 * node to both, and the affected set is a set — so it can never be larger than
 * the four counts added up. When even that ceiling is under the threshold the
 * rule provably cannot fire, and the missing field does not matter.
 *
 * This is what makes the lever answerable over a journal written before today
 * rather than only over records written after it.
 */
const affectedNodeCeiling = (summary: AssessmentSummary): number =>
  summary.insertedNodeCount +
  summary.removedNodeCount +
  summary.movedNodeCount +
  summary.configuredNodeCount

/**
 * Whether a rule's missing input can change its answer.
 *
 * Absent is not empty (0045), so the question is never "what shall we assume" —
 * it is whether this policy, on this record, could have reached the field at
 * all. Each entry is a fact about the record and not a default: a change that
 * removed no nodes removed no types, a change that configured no nodes set no
 * prop keys, and a policy protecting nothing never looks at either list.
 */
const unreadableUnder = (
  summary: AssessmentSummary,
  policy: GatePolicy
): readonly StakeFactorCode[] => {
  const protects = policy.protectedPrimitiveTypes.length > 0

  return [
    ...(protects && summary.removedPrimitiveTypes === undefined && summary.removedNodeCount > 0
      ? (["protected-type-removed"] as const)
      : []),
    ...(protects && summary.relocatedPrimitiveTypes === undefined && summary.movedNodeCount > 0
      ? (["protected-type-relocated"] as const)
      : []),
    ...(policy.protectedPropKeys.length > 0 &&
    summary.configuredPropKeys === undefined &&
    summary.configuredNodeCount > 0
      ? (["protected-prop-configured"] as const)
      : []),
    ...(summary.affectedNodeCount === undefined &&
    affectedNodeCeiling(summary) >= policy.breadthThreshold
      ? (["broad-change"] as const)
      : []),
    ...(summary.stakeFactorCodes === undefined ? FIXED_STAKE_FACTOR_CODES : []),
  ]
}

/**
 * The record as a measurement, with every absent list read as absent.
 *
 * `[]` here is not a claim that nothing happened — it is what the rule has to be
 * handed to produce no factor, and `unreadableUnder` is what says the resulting
 * silence may be ignorance rather than a measurement. The two halves are
 * separate on purpose: a measurement cannot hold "unknown", and a level cannot
 * carry a caveat.
 */
const measurementFrom = (summary: AssessmentSummary): StakeMeasurement => ({
  insertedNodeCount: summary.insertedNodeCount,
  removedNodeCount: summary.removedNodeCount,
  movedNodeCount: summary.movedNodeCount,
  affectedNodeCount: summary.affectedNodeCount ?? 0,
  shallowestAffectedDepth: summary.shallowestAffectedDepth,
  touchedPrimitiveTypes: summary.touchedPrimitiveTypes,
  removedPrimitiveTypes: summary.removedPrimitiveTypes ?? [],
  relocatedPrimitiveTypes: summary.relocatedPrimitiveTypes ?? [],
  configuredPropKeys: summary.configuredPropKeys ?? [],
})

export const remeasureStakes = (
  summary: AssessmentSummary,
  policy: GatePolicy
): RemeasuredStakes => {
  const remeasured: readonly RemeasuredFactor[] = measureStakes(
    measurementFrom(summary),
    policy
  ).map((factor) => ({ code: factor.code, level: factor.level, source: "remeasured" }))

  const carried: readonly RemeasuredFactor[] = (summary.stakeFactorCodes ?? [])
    .filter(isFixedStakeFactor)
    .map((code) => ({ code, level: fixedStakeLevel(code), source: "recorded" }))

  const factors = [...remeasured, ...carried]

  return {
    level: highestStake(factors.map((factor) => factor.level)),
    factors,
    unreadable: unreadableUnder(summary, policy),
  }
}
