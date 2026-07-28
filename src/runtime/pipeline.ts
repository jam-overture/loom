import type { IdFactory } from "../ids.js"
import { applyDelta } from "../tree/apply.js"
import type { TreeDelta } from "../tree/delta.js"
import type { TreeError } from "../tree/errors.js"
import type { LoomTree } from "../tree/tree.js"

import { assessChange, type ChangeAssessment } from "./assessment.js"
import type { Disposition } from "./disposition.js"
import type { Clock, EventSink, RuntimeEvent } from "./events.js"
import { gate } from "./gate.js"
import type { EditIntent } from "./intent.js"
import type { ChangeInterpreter, InterpretationError } from "./interpreter.js"
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
  readonly policy: GatePolicy
  readonly events: EventSink
  readonly clock: Clock
  readonly idFactory: IdFactory
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

const emitter = (runtime: CompositionRuntime, tree: LoomTree) => (event: RuntimeEvent) =>
  runtime.events.emit({ treeId: tree.treeId, occurredAt: runtime.clock.now(), event })

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
): CompositionOutcome => {
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

export const composeChange = async (
  runtime: CompositionRuntime,
  tree: LoomTree,
  intent: EditIntent
): Promise<CompositionOutcome> => {
  const emit = emitter(runtime, tree)
  emit({ type: "intent-received", intent })

  const interpreted = await runtime.interpreter.interpret(intent, tree)
  if (!interpreted.ok) {
    emit({ type: "interpretation-failed", intent, error: interpreted.error })

    return { kind: "not-interpreted", error: interpreted.error }
  }

  const proposal = interpreted.value
  emit({ type: "change-proposed", proposal })

  const assessed = assessChange(tree, proposal, runtime.policy, runtime.idFactory.deltaId())
  if (!assessed.ok) {
    emit({ type: "assessment-failed", proposal, error: assessed.error })

    return { kind: "not-applicable", proposal, error: assessed.error }
  }

  const assessment = assessed.value
  emit({ type: "change-assessed", assessment })

  const disposition = gate(assessment, runtime.policy)
  emit({ type: "disposition-decided", proposalId: proposal.proposalId, disposition })

  return dispositionOutcome(runtime, tree, assessment, disposition)
}

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
  proposal: ProposedChange
): CompositionOutcome => {
  const emit = emitter(runtime, tree)

  const assessed = assessChange(tree, proposal, runtime.policy, runtime.idFactory.deltaId())
  if (!assessed.ok) {
    emit({ type: "assessment-failed", proposal, error: assessed.error })

    return { kind: "not-applicable", proposal, error: assessed.error }
  }

  const assessment = assessed.value
  emit({ type: "change-assessed", assessment })

  const disposition = gate(assessment, runtime.policy)
  emit({ type: "disposition-decided", proposalId: proposal.proposalId, disposition })

  if (disposition.kind === "rejected") {
    return { kind: "rejected", assessment, disposition }
  }

  return applyAssessedChange(runtime, tree, assessment, disposition)
}
