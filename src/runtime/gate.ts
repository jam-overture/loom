import type { ChangeAssessment } from "./assessment.js"
import type {
  Disposition,
  DispositionKind,
  DispositionReason,
  DispositionReasonCode,
} from "./disposition.js"
import { policyFingerprintOf } from "./policy-fingerprint.js"
import { ceilingFor, type GatePolicy } from "./policy.js"
import { isAbove, isAtLeast } from "./stake-level.js"
import { stakeFactor } from "./stakes.js"

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
 * say, so "small but permanent" is never silently auto-applied. A change that
 * discards work already in the log is escalated there too, and for the same
 * reason: the ceiling is per origin, and neither of those two properties should
 * depend on who asked (0035).
 */

/**
 * The code a rung stamps when it fires. Every reason code but the acceptance.
 *
 * Excluded by type rather than by care: `within-policy` is what the Gate says
 * when nothing objected, and a rung that stamped it would be a rung reporting
 * that it did not fire.
 */
export type EscalationCode = Exclude<DispositionReasonCode, "within-policy">

/**
 * One rung of the ladder: what it stamps, what it decides, and when it fires.
 *
 * A rung declares its code and its kind once, and answers with the detail line
 * when it fires and `null` when it does not. The rule cannot stamp a code other
 * than its own, and the ladder can be read off the rungs — which is what lets
 * anything outside this module count the rules rather than keep a list of them.
 */
type GateRule = {
  readonly code: EscalationCode
  readonly kind: Exclude<DispositionKind, "accepted">
  readonly fires: (assessment: ChangeAssessment, policy: GatePolicy) => string | null
}

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
  /**
   * And what that policy contained, for the same reason and in the same place. A
   * name is what a host can look up; a fingerprint is what proves the name still
   * means what it meant. Neither is trustworthy from the caller.
   */
  policyFingerprint: policyFingerprintOf(policy),
  /**
   * And which optional checks were in place while it was judged, read off the
   * assessment rather than taken from a caller — the assessment is what was
   * handed the seams, so it is the only thing here that can say.
   *
   * Stamped on every disposition, including the accepted ones, and that is the
   * point rather than an oversight. A check that fires leaves a refusal a reader
   * can see; a check that was *never wired* leaves nothing at all, and the whole
   * gap this closes is the silent case.
   */
  wiredChecks: assessment.wiredChecks,
  /**
   * Stamped on every disposition rather than only on the one
   * `confirmIrreversible` produced. Which rung fired and why a change cannot be
   * taken back are separate facts: a change can be held for discarding later
   * work *and* be irreversible, and the rung that won says nothing about the
   * second. Reading it off the assessment here is what keeps a reader of the
   * record from inferring one from the other.
   */
  ...(assessment.reversibility.reasons.length > 0
    ? { irreversibilityReasons: assessment.reversibility.reasons }
    : {}),
})

/** Too unsure to act on at all — asking the user to confirm a guess is noise. */
const rejectBelowConfidenceFloor: GateRule = {
  code: "confidence-below-floor",
  kind: "rejected",
  fires: (assessment, policy) => {
    const { confidence } = assessment.proposal.provenance
    if (confidence >= policy.confidenceFloor) return null

    return `interpreter confidence ${confidence} is below the floor of ${policy.confidenceFloor}`
  },
}

/** Some changes are not offered to the user at all, however they were asked for. */
const rejectAtRefusalFloor: GateRule = {
  code: "stakes-at-refusal-floor",
  kind: "rejected",
  fires: (assessment, policy) => {
    if (!isAtLeast(assessment.stakes.level, policy.refusalFloor)) return null

    const detail = assessment.stakes.factors.map((factor) => factor.detail).join("; ")

    return detail || `stakes reached ${policy.refusalFloor}`
  },
}

/** Undo would not undo reality, so a human decides — regardless of how small it looks. */
const confirmIrreversible: GateRule = {
  code: "irreversible",
  kind: "requires-confirmation",
  fires: (assessment) => {
    if (assessment.reversibility.reversible) return null

    const detail = assessment.reversibility.reasons.map((reason) => reason.code).join("; ")

    return `cannot be undone cleanly: ${detail}`
  },
}

/**
 * A change that writes over work already in the log is never applied without a
 * person, whatever latitude its origin has.
 *
 * This is a rule rather than a level, because a level cannot say "never
 * auto-apply": the ceilings are per origin (0002), so a `high` factor is a hold
 * for one origin and an auto-apply for another. The thing that must not happen —
 * work discarded with nobody in the loop — does not depend on who asked.
 *
 * It sits below the refusal floor deliberately. A host that has declared this
 * much damage refusable gets a refusal; the floor stays sovereign over the
 * escalations.
 */
const confirmDiscardsLaterWork: GateRule = {
  code: "discards-later-work",
  kind: "requires-confirmation",
  fires: (assessment) => stakeFactor(assessment.stakes, "discards-later-work")?.detail ?? null,
}

/**
 * A change that moves where a form posts is never applied without a person,
 * whatever latitude its origin has.
 *
 * The same argument as the rule above, about the same kind of thing: a level
 * cannot say "never auto-apply" while ceilings are per origin, and the fact that
 * must not pass unnoticed — the next visitor's message arriving somewhere else —
 * does not depend on who asked for it.
 *
 * Below the refusal floor for the same reason, so a host that has declared this
 * much damage refusable still gets a refusal.
 */
const confirmRedirectedSubmission: GateRule = {
  code: "redirected-submission",
  kind: "requires-confirmation",
  fires: (assessment) => stakeFactor(assessment.stakes, "redirected-submission")?.detail ?? null,
}

/**
 * A change that points a region at different data is never applied without a
 * person, whatever latitude its origin has.
 *
 * The same argument as the rule above, at the other end of the same pipe. That
 * one keeps the next visitor's message from arriving somewhere else unnoticed;
 * this one keeps something the host never meant to publish from appearing on a
 * public page unnoticed. Neither fact depends on who asked.
 *
 * Below the refusal floor for the same reason, so a host that has declared this
 * much damage refusable still gets a refusal.
 */
const confirmRepointedBinding: GateRule = {
  code: "repointed-binding",
  kind: "requires-confirmation",
  fires: (assessment) => stakeFactor(assessment.stakes, "repointed-binding")?.detail ?? null,
}

const confirmAboveCeiling: GateRule = {
  code: "stakes-above-ceiling",
  kind: "requires-confirmation",
  fires: (assessment, policy) => {
    const ceiling = ceilingFor(policy, assessment.proposal.provenance.origin)
    if (!isAbove(assessment.stakes.level, ceiling)) return null

    const detail = assessment.stakes.factors.map((factor) => factor.detail).join("; ")

    return (
      detail ||
      `${assessment.stakes.level} stakes exceed the ${ceiling} ceiling for ${assessment.proposal.provenance.origin}`
    )
  },
}

const confirmBelowMinimumConfidence: GateRule = {
  code: "confidence-below-minimum",
  kind: "requires-confirmation",
  fires: (assessment, policy) => {
    const { confidence } = assessment.proposal.provenance
    if (confidence >= policy.minimumConfidence) return null

    return `interpreter confidence ${confidence} is below ${policy.minimumConfidence}`
  },
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
  confirmDiscardsLaterWork,
  confirmRedirectedSubmission,
  confirmRepointedBinding,
  confirmAboveCeiling,
  confirmBelowMinimumConfidence,
]

/**
 * The ladder, in the order it is consulted, read off the rules themselves.
 *
 * Published because the number of rungs and their precedence are the thing this
 * repository describes most often and in the most places — a record, a lesson,
 * a documentation page, a portal that shows a reader which rung fired. Every one
 * of those otherwise counts the rules by reading the source and writing the
 * number down, which is a copy, and a copy of a list is wrong from the first
 * time the list changes.
 *
 * It is derived rather than declared, so it cannot disagree with the rules it
 * describes: inserting a rung changes this list in the same edit.
 */
export const ESCALATION_LADDER: readonly EscalationCode[] = ESCALATION_RULES.map(
  (rule) => rule.code
)

export const gate = (assessment: ChangeAssessment, policy: GatePolicy): Disposition => {
  for (const rule of ESCALATION_RULES) {
    const detail = rule.fires(assessment, policy)
    if (detail !== null) return decide(assessment, policy, rule.kind, { code: rule.code, detail })
  }

  return accept(assessment, policy)
}
