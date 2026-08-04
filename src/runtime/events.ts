import type { IntentId, ProposalId, TreeId } from "../ids.js"
import type { StoreError } from "../store/errors.js"
import type { TreeDelta } from "../tree/delta.js"
import type { TreeError } from "../tree/errors.js"

import type { ChangeAssessment } from "./assessment.js"
import type { Disposition, DispositionReason } from "./disposition.js"
import type { EditIntent } from "./intent.js"
import type { InterpretationError } from "./interpreter.js"
import type { GatePolicy } from "./policy.js"
import type { ProposedChange } from "./proposal.js"

/**
 * The runtime narrates itself.
 *
 * Every stage emits, including the ones that fail, because the telemetry
 * pipeline needs the rejected and unconfirmed changes as much as the applied
 * ones — a Gate that refuses the right things is only demonstrable if refusals
 * are recorded.
 *
 * These events are the runtime talking to itself within one request, so they
 * carry whole assessments and whole inverse deltas. What survives the request is
 * a narrowing of them (0023), which `src/telemetry` owns.
 */

export type RuntimeEvent =
  | { readonly type: "intent-received"; readonly intent: EditIntent }
  /**
   * Which policy this intent will be judged under, settled before anything is
   * interpreted. Emitted even for an intent that never reaches a disposition,
   * because "which policy was in force" is a question about the ask rather than
   * about the answer — and an interpretation failure under a strict policy and
   * one under a lax policy are not the same event.
   *
   * It carries the whole policy: within a request the next stage needs the
   * values, not the name. What survives is narrower (0023).
   */
  | { readonly type: "policy-resolved"; readonly intentId: IntentId; readonly policy: GatePolicy }
  | { readonly type: "interpretation-failed"; readonly intent: EditIntent; readonly error: InterpretationError }
  | { readonly type: "change-proposed"; readonly proposal: ProposedChange }
  | { readonly type: "assessment-failed"; readonly proposal: ProposedChange; readonly error: TreeError }
  | { readonly type: "change-assessed"; readonly assessment: ChangeAssessment }
  | { readonly type: "disposition-decided"; readonly proposalId: ProposalId; readonly disposition: Disposition }
  /**
   * A refusal was handed back for one more attempt. Emitted *after* the
   * refusal's own `disposition-decided`, never instead of it: a change that was
   * refused and then repaired into something acceptable must leave both halves
   * of that story in the record, or the pattern becomes invisible.
   */
  | {
      readonly type: "repair-requested"
      readonly refusedProposalId: ProposalId
      readonly reason: DispositionReason
    }
  | {
      readonly type: "repair-failed"
      readonly refusedProposalId: ProposalId
      readonly error: InterpretationError
    }
  | {
      readonly type: "change-applied"
      readonly proposalId: ProposalId
      readonly revision: number
      readonly inverse: TreeDelta
    }
  | { readonly type: "application-failed"; readonly proposalId: ProposalId; readonly error: TreeError }
  /**
   * An intent that never reached interpretation, because the tree it named had
   * already moved on. Narrated rather than silently returned: a rising rate of
   * this is contention, and it is the one failure a client is expected to
   * recover from on its own (0017).
   */
  | { readonly type: "intent-not-writable"; readonly intent: EditIntent; readonly error: StoreError }
  /**
   * The Gate held a change back and custody of it succeeded, so there is
   * something for a human to answer. Distinct from the `disposition-decided`
   * that preceded it: one is a judgment, the other is a proposal that still
   * exists to be confirmed.
   */
  | { readonly type: "proposal-held"; readonly proposalId: ProposalId }
  /**
   * Custody failed, so a change the Gate was willing to offer is simply gone.
   * Emitted because the alternative is a change that disappears between two
   * events that both say things went well.
   */
  | { readonly type: "hold-failed"; readonly proposalId: ProposalId; readonly detail: string }
  /**
   * A human answered a held proposal. The disposition that follows is the Gate's
   * second look.
   *
   * `actor` is who answered, which is not who asked: a hold exists precisely
   * because the Gate wanted a second person, and provenance records only the
   * first. This event is the only place the approval is attributed (0027), so a
   * host that drops it keeps the change and loses who allowed it.
   */
  | { readonly type: "hold-confirmed"; readonly proposalId: ProposalId; readonly actor?: string }
  /**
   * A human answered no. The most valuable event in this list for §6: it is the
   * only one that says a change the Gate was prepared to allow was not wanted,
   * which is what calibration (0007) has to learn from — and a refusal is only
   * evidence about a reviewer if it says which one.
   */
  | { readonly type: "hold-discarded"; readonly proposalId: ProposalId; readonly actor?: string }
  /**
   * The delta reached the log. `change-applied` says a tree in memory accepted
   * it; this says the truth (0016) moved.
   */
  | { readonly type: "change-committed"; readonly proposalId: ProposalId; readonly revision: number }
  /**
   * Accepted, applied in memory, and then not persisted. The gap between
   * `change-applied` and this is the one place the event stream could lie about
   * what a tree contains, so it is narrated rather than returned only to the
   * caller.
   */
  | { readonly type: "commit-failed"; readonly proposalId: ProposalId; readonly error: StoreError }

export type RuntimeEventEnvelope = {
  readonly treeId: TreeId
  readonly occurredAt: string
  readonly event: RuntimeEvent
}

/**
 * Emission is fire-and-forget: a sink that throws or blocks must not be able to
 * fail a change the Gate already accepted. Hosts that need durability buffer
 * behind this interface.
 */
export interface EventSink {
  readonly emit: (envelope: RuntimeEventEnvelope) => void
}

/** Reading the clock is a side effect, so it enters through a seam like ids do. */
export interface Clock {
  readonly now: () => string
}

export const systemClock: Clock = {
  now: () => new Date().toISOString(),
}

export const noopEventSink: EventSink = {
  emit: () => undefined,
}
