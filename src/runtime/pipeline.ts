import type { IdFactory } from "../ids.js"
import { applyDelta } from "../tree/apply.js"
import type { TreeDelta } from "../tree/delta.js"
import type { TreeError } from "../tree/errors.js"
import type { LoomTree } from "../tree/tree.js"

import { assessChange, type ChangeAssessment } from "./assessment.js"
import type { Disposition } from "./disposition.js"
import type { Clock, EventSink } from "./events.js"
import { gate } from "./gate.js"
import type { EditIntent } from "./intent.js"
import type { ChangeInterpreter, ChangeRepairer, InterpretationError } from "./interpreter.js"
import { narrator } from "./narration.js"
import type { PolicySource } from "./policy-source.js"
import type { GatePolicy } from "./policy.js"
import type { ProposedChange } from "./proposal.js"

/**
 * The composition runtime: EditIntent → ProposedChange → Gate → Disposition →
 * Apply, narrating each stage as it goes.
 *
 * The orchestrator coordinates and does nothing else. Interpretation belongs to
 * the interpreter, judgment to the Gate, structural change to `applyDelta`;
 * this module's only jobs are sequencing them, emitting events, and turning the
 * result into an outcome a caller can act on.
 */

export type CompositionRuntime = {
  readonly interpreter: ChangeInterpreter
  /**
   * Which policy judges a given change. A source rather than a policy, because
   * one runtime may serve trees that do not deserve the same latitude; a host
   * with one policy says so with `fixedPolicy`.
   */
  readonly policySource: PolicySource
  readonly events: EventSink
  readonly clock: Clock
  readonly idFactory: IdFactory
  /**
   * Optional, and absent by default. With no repairer, a refusal is terminal.
   * With one, a refused proposal gets exactly one more attempt — see
   * `attemptRepair`, where the "exactly one" is structural rather than a
   * counter that could drift.
   */
  readonly repairer?: ChangeRepairer
}

export type CompositionOutcome =
  | {
      readonly kind: "applied"
      readonly tree: LoomTree
      readonly assessment: ChangeAssessment
      readonly disposition: Disposition
      readonly inverse: TreeDelta
    }
  | {
      readonly kind: "awaiting-confirmation"
      readonly assessment: ChangeAssessment
      readonly disposition: Disposition
    }
  | {
      readonly kind: "rejected"
      readonly assessment: ChangeAssessment
      readonly disposition: Disposition
    }
  | { readonly kind: "not-interpreted"; readonly error: InterpretationError }
  | {
      readonly kind: "not-applicable"
      readonly proposal: ProposedChange
      readonly error: TreeError
    }

const emitter = (runtime: CompositionRuntime, tree: LoomTree) =>
  narrator(runtime.events, runtime.clock, tree.treeId)

/**
 * Applies an already-assessed change. Shared by the auto-apply path and the
 * confirmation path so both emit the same events and enforce the same revision
 * check — a confirmation that arrives after the tree moved on must not land.
 */
const applyAssessedChange = (
  runtime: CompositionRuntime,
  tree: LoomTree,
  assessment: ChangeAssessment,
  disposition: Disposition
): Extract<CompositionOutcome, { readonly kind: "applied" | "not-applicable" }> => {
  const emit = emitter(runtime, tree)
  const applied = applyDelta(tree, assessment.proposal.delta)

  if (!applied.ok) {
    emit({
      type: "application-failed",
      proposalId: assessment.proposal.proposalId,
      error: applied.error,
    })

    return { kind: "not-applicable", proposal: assessment.proposal, error: applied.error }
  }

  emit({
    type: "change-applied",
    proposalId: assessment.proposal.proposalId,
    revision: applied.value.revision,
    inverse: assessment.reversibility.inverse,
  })

  return {
    kind: "applied",
    tree: applied.value,
    assessment,
    disposition,
    inverse: assessment.reversibility.inverse,
  }
}

const dispositionOutcome = (
  runtime: CompositionRuntime,
  tree: LoomTree,
  assessment: ChangeAssessment,
  disposition: Disposition
): CompositionOutcome => {
  switch (disposition.kind) {
    case "accepted":
      return applyAssessedChange(runtime, tree, assessment, disposition)
    case "requires-confirmation":
      return { kind: "awaiting-confirmation", assessment, disposition }
    case "rejected":
      return { kind: "rejected", assessment, disposition }
  }
}

/**
 * Assess a proposal and put it to the Gate, narrating both. Shared by the first
 * attempt and the repaired one so that a repair is judged by exactly the same
 * function, against exactly the same policy, as the proposal it replaces.
 */
type Judgement =
  | {
      readonly kind: "judged"
      readonly assessment: ChangeAssessment
      readonly disposition: Disposition
    }
  | { readonly kind: "not-applicable"; readonly proposal: ProposedChange; readonly error: TreeError }

const judgeProposal = (
  runtime: CompositionRuntime,
  tree: LoomTree,
  proposal: ProposedChange,
  policy: GatePolicy
): Judgement => {
  const emit = emitter(runtime, tree)
  emit({ type: "change-proposed", proposal })

  const assessed = assessChange(tree, proposal, policy, runtime.idFactory.deltaId())
  if (!assessed.ok) {
    emit({ type: "assessment-failed", proposal, error: assessed.error })

    return { kind: "not-applicable", proposal, error: assessed.error }
  }

  const assessment = assessed.value
  emit({ type: "change-assessed", assessment })

  const disposition = gate(assessment, policy)
  emit({ type: "disposition-decided", proposalId: proposal.proposalId, disposition })

  return { kind: "judged", assessment, disposition }
}

/**
 * One attempt, and the "one" is structural: this function judges the repaired
 * proposal and returns its outcome, so there is no path back into itself and no
 * counter to get wrong. A repair that is refused again is terminal.
 *
 * The runtime — not the repairer — stamps `repairOf`, so a weaker second
 * proposal cannot present itself as an unrelated first attempt. Both
 * dispositions are already in the event stream by the time this returns, which
 * is what makes "refused, then accepted a smaller version" a pattern telemetry
 * can find rather than one it has to infer.
 */
const attemptRepair = async (
  runtime: CompositionRuntime,
  tree: LoomTree,
  intent: EditIntent,
  policy: GatePolicy,
  repairer: ChangeRepairer,
  refusal: { readonly assessment: ChangeAssessment; readonly disposition: Disposition }
): Promise<CompositionOutcome> => {
  const emit = emitter(runtime, tree)
  const refused = refusal.assessment.proposal
  const { disposition } = refusal

  emit({
    type: "repair-requested",
    refusedProposalId: refused.proposalId,
    reason: disposition.reason,
  })

  const repaired = await repairer.repair({ intent, refused, disposition }, tree)
  if (!repaired.ok) {
    emit({ type: "repair-failed", refusedProposalId: refused.proposalId, error: repaired.error })

    return { kind: "rejected", assessment: refusal.assessment, disposition }
  }

  const judged = judgeProposal(
    runtime,
    tree,
    { ...repaired.value, repairOf: refused.proposalId },
    policy
  )

  return judged.kind === "not-applicable"
    ? judged
    : dispositionOutcome(runtime, tree, judged.assessment, judged.disposition)
}

export const composeChange = async (
  runtime: CompositionRuntime,
  tree: LoomTree,
  intent: EditIntent
): Promise<CompositionOutcome> => {
  const emit = emitter(runtime, tree)
  emit({ type: "intent-received", intent })

  /**
   * Resolved once, before interpretation, and used for every judgment this
   * intent produces — including a repair's. Resolving again per proposal would
   * let a repair be judged by a different policy than the proposal it replaces,
   * which is the one comparison 0006 exists to make.
   */
  const policy = runtime.policySource.resolve({ tree, intent })
  emit({ type: "policy-resolved", intentId: intent.intentId, policy })

  const interpreted = await runtime.interpreter.interpret(intent, tree)
  if (!interpreted.ok) {
    emit({ type: "interpretation-failed", intent, error: interpreted.error })

    return { kind: "not-interpreted", error: interpreted.error }
  }

  const judged = judgeProposal(runtime, tree, interpreted.value, policy)
  if (judged.kind === "not-applicable") return judged

  const { repairer } = runtime
  if (judged.disposition.kind === "rejected" && repairer) {
    return attemptRepair(runtime, tree, intent, policy, repairer, judged)
  }

  return dispositionOutcome(runtime, tree, judged.assessment, judged.disposition)
}

/**
 * What confirming can produce. Narrower than `CompositionOutcome` because
 * confirmation starts from a proposal that already exists: there is nothing left
 * to interpret, and a change the Gate holds a second time is not offered a third
 * — it applies or it does not.
 */
export type ConfirmationOutcome = Extract<
  CompositionOutcome,
  { readonly kind: "applied" | "rejected" | "not-applicable" }
>

/**
 * Completes a change the Gate held back. The assessment is recomputed against
 * the tree as it stands now rather than trusting the one captured at proposal
 * time, so a confirmation cannot smuggle in a decision made about a different
 * tree. A change the Gate now refuses outright stays refused, even with a
 * human saying yes.
 */
export const confirmChange = (
  runtime: CompositionRuntime,
  tree: LoomTree,
  proposal: ProposedChange,
  intent: EditIntent
): ConfirmationOutcome => {
  const emit = emitter(runtime, tree)

  /**
   * Resolved again rather than carried over from the hold, for the same reason
   * the assessment is recomputed: the second look is a look at things as they
   * are now. A host that narrowed a policy while a proposal sat in the queue
   * meant that for the queue too, and the disposition records which one
   * actually decided.
   */
  const policy = runtime.policySource.resolve({ tree, intent })
  emit({ type: "policy-resolved", intentId: intent.intentId, policy })

  const assessed = assessChange(tree, proposal, policy, runtime.idFactory.deltaId())
  if (!assessed.ok) {
    emit({ type: "assessment-failed", proposal, error: assessed.error })

    return { kind: "not-applicable", proposal, error: assessed.error }
  }

  const assessment = assessed.value
  emit({ type: "change-assessed", assessment })

  const disposition = gate(assessment, policy)
  emit({ type: "disposition-decided", proposalId: proposal.proposalId, disposition })

  if (disposition.kind === "rejected") {
    return { kind: "rejected", assessment, disposition }
  }

  return applyAssessedChange(runtime, tree, assessment, disposition)
}
