import type { ChangeAssessment } from "./assessment.js"
import type { Disposition, DispositionReason } from "./disposition.js"
import { ceilingFor, type GatePolicy } from "./policy.js"
import { isAbove, isAtLeast } from "./stake-level.js"

/**
 * The Gate.
 *
 * A pure function from an assessment and a policy to a disposition. It performs
 * no IO, reads no clock, touches no tree, and holds no state — the same inputs
 * always produce the same decision, which is what makes the runtime's behaviour
 * auditable after the fact and testable before it.
 *
 * The decision is a short ordered list of rules; the first one that fires wins.
 * Order encodes precedence: a refusal outranks a request for confirmation, and
 * an irreversible change is escalated before the ordinary stakes ceiling gets a
 * say, so "small but permanent" is never silently auto-applied.
 */

type GateRule = (assessment: ChangeAssessment, policy: GatePolicy) => Disposition | null

const decide = (
  assessment: ChangeAssessment,
  policy: GatePolicy,
  kind: Disposition["kind"],
  reason: DispositionReason
): Disposition => ({
  kind,
  reason,
  stakes: assessment.stakes.level,
  reversible: assessment.reversibility.reversible,
  confidence: assessment.proposal.provenance.confidence,
  /**
   * The one place a judgment is attributed to the policy that made it. Stamped
   * here rather than by the caller because the caller could stamp a different
   * one than the rules consulted, and a disposition naming a policy it was not
   * decided under is worse than one naming none.
   */
  policyId: policy.policyId,
})

/** Too unsure to act on at all — asking the user to confirm a guess is noise. */
const rejectBelowConfidenceFloor: GateRule = (assessment, policy) => {
  const { confidence } = assessment.proposal.provenance
  if (confidence >= policy.confidenceFloor) return null

  return decide(assessment, policy, "rejected", {
    code: "confidence-below-floor",
    detail: `interpreter confidence ${confidence} is below the floor of ${policy.confidenceFloor}`,
  })
}

/** Some changes are not offered to the user at all, however they were asked for. */
const rejectAtRefusalFloor: GateRule = (assessment, policy) => {
  if (!isAtLeast(assessment.stakes.level, policy.refusalFloor)) return null

  const detail = assessment.stakes.factors.map((factor) => factor.detail).join("; ")

  return decide(assessment, policy, "rejected", {
    code: "stakes-at-refusal-floor",
    detail: detail || `stakes reached ${policy.refusalFloor}`,
  })
}

/** Undo would not undo reality, so a human decides — regardless of how small it looks. */
const confirmIrreversible: GateRule = (assessment, policy) => {
  if (assessment.reversibility.reversible) return null

  const detail = assessment.reversibility.reasons.map((reason) => reason.code).join("; ")

  return decide(assessment, policy, "requires-confirmation", {
    code: "irreversible",
    detail: `cannot be undone cleanly: ${detail}`,
  })
}

const confirmAboveCeiling: GateRule = (assessment, policy) => {
  const ceiling = ceilingFor(policy, assessment.proposal.provenance.origin)
  if (!isAbove(assessment.stakes.level, ceiling)) return null

  const detail = assessment.stakes.factors.map((factor) => factor.detail).join("; ")

  return decide(assessment, policy, "requires-confirmation", {
    code: "stakes-above-ceiling",
    detail:
      detail ||
      `${assessment.stakes.level} stakes exceed the ${ceiling} ceiling for ${assessment.proposal.provenance.origin}`,
  })
}

const confirmBelowMinimumConfidence: GateRule = (assessment, policy) => {
  const { confidence } = assessment.proposal.provenance
  if (confidence >= policy.minimumConfidence) return null

  return decide(assessment, policy, "requires-confirmation", {
    code: "confidence-below-minimum",
    detail: `interpreter confidence ${confidence} is below ${policy.minimumConfidence}`,
  })
}

/** Nothing objected, so the change goes through. */
const accept = (assessment: ChangeAssessment, policy: GatePolicy): Disposition =>
  decide(assessment, policy, "accepted", {
    code: "within-policy",
    detail: "reversible, within the stakes ceiling, and confidently interpreted",
  })

const ESCALATION_RULES: readonly GateRule[] = [
  rejectBelowConfidenceFloor,
  rejectAtRefusalFloor,
  confirmIrreversible,
  confirmAboveCeiling,
  confirmBelowMinimumConfidence,
]

export const gate = (assessment: ChangeAssessment, policy: GatePolicy): Disposition => {
  for (const rule of ESCALATION_RULES) {
    const escalation = rule(assessment, policy)
    if (escalation) return escalation
  }

  return accept(assessment, policy)
}
