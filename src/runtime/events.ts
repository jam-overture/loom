import type { ProposalId, TreeId } from "../ids.js"
import type { TreeDelta } from "../tree/delta.js"
import type { TreeError } from "../tree/errors.js"

import type { ChangeAssessment } from "./assessment.js"
import type { Disposition } from "./disposition.js"
import type { EditIntent } from "./intent.js"
import type { InterpretationError } from "./interpreter.js"
import type { ProposedChange } from "./proposal.js"

/**
 * The runtime narrates itself.
 *
 * Every stage emits, including the ones that fail, because the telemetry
 * pipeline needs the rejected and unconfirmed changes as much as the applied
 * ones — a Gate that refuses the right things is only demonstrable if refusals
 * are recorded. Emission happens from day one even though nothing consumes it
 * yet.
 */

export type RuntimeEvent =
  | { readonly type: "intent-received"; readonly intent: EditIntent }
  | { readonly type: "interpretation-failed"; readonly intent: EditIntent; readonly error: InterpretationError }
  | { readonly type: "change-proposed"; readonly proposal: ProposedChange }
  | { readonly type: "assessment-failed"; readonly proposal: ProposedChange; readonly error: TreeError }
  | { readonly type: "change-assessed"; readonly assessment: ChangeAssessment }
  | { readonly type: "disposition-decided"; readonly proposalId: ProposalId; readonly disposition: Disposition }
  | {
      readonly type: "change-applied"
      readonly proposalId: ProposalId
      readonly revision: number
      readonly inverse: TreeDelta
    }
  | { readonly type: "application-failed"; readonly proposalId: ProposalId; readonly error: TreeError }

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
