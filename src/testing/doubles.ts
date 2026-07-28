import type { IdFactory, IntentId, TreeId } from "../ids.js"
import type { Result } from "../result.js"
import type { Clock, EventSink, RuntimeEventEnvelope } from "../runtime/events.js"
import type { EditIntent, IntentOrigin } from "../runtime/intent.js"
import type { ChangeInterpreter, InterpretationError } from "../runtime/interpreter.js"
import type { ProposedChange } from "../runtime/proposal.js"
import type { TreeDelta } from "../tree/delta.js"

/**
 * Test doubles for the runtime's three impure seams — the interpreter, the
 * clock, and the event sink. They live in `src/testing` rather than beside the
 * tests because the renderer and portal will want the same ones.
 */

export const FIXED_INSTANT = "2026-07-28T00:00:00.000Z"

export const fixedClock = (instant: string = FIXED_INSTANT): Clock => ({ now: () => instant })

export type CollectingEventSink = EventSink & {
  readonly envelopes: readonly RuntimeEventEnvelope[]
  readonly types: () => readonly string[]
}

export const collectingEventSink = (): CollectingEventSink => {
  const envelopes: RuntimeEventEnvelope[] = []

  return {
    emit: (envelope) => {
      envelopes.push(envelope)
    },
    envelopes,
    types: () => envelopes.map((envelope) => envelope.event.type),
  }
}

/** Returns whatever it was handed, so tests drive the pipeline from a fixed script. */
export const scriptedInterpreter = (
  script: Result<ProposedChange, InterpretationError>
): ChangeInterpreter => ({
  interpret: () => Promise.resolve(script),
})

export type IntentDraft = {
  readonly treeId: TreeId
  readonly baseRevision: number
  readonly utterance?: string
  readonly origin?: IntentOrigin
}

export const buildIntent = (idFactory: IdFactory, draft: IntentDraft): EditIntent => ({
  intentId: idFactory.intentId(),
  treeId: draft.treeId,
  baseRevision: draft.baseRevision,
  origin: draft.origin ?? "user-instruction",
  utterance: draft.utterance ?? "make it better",
  observedAt: FIXED_INSTANT,
})

export type ProposalDraft = {
  readonly intentId: IntentId
  readonly delta: TreeDelta
  readonly rationale?: string
  readonly origin?: IntentOrigin
  readonly confidence?: number
}

export const buildProposal = (idFactory: IdFactory, draft: ProposalDraft): ProposedChange => ({
  proposalId: idFactory.proposalId(),
  intentId: draft.intentId,
  delta: draft.delta,
  rationale: draft.rationale ?? "satisfies the intent",
  provenance: {
    origin: draft.origin ?? "user-instruction",
    interpreter: "scripted",
    confidence: draft.confidence ?? 0.9,
    interpretedAt: FIXED_INSTANT,
  },
})
