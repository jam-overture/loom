import type {
  ModelClient,
  ModelClientError,
  ModelCompletion,
  ModelRequest,
} from "../interpretation/client.js"
import type { IdFactory, IntentId, TreeId } from "../ids.js"
import { ok, type Result } from "../result.js"
import type { Clock, EventSink, RuntimeEventEnvelope } from "../runtime/events.js"
import type { EditIntent, IntentOrigin } from "../runtime/intent.js"
import type {
  ChangeInterpreter,
  ChangeRepairer,
  InterpretationError,
  RepairRequest,
} from "../runtime/interpreter.js"
import type { AuthorKind, ProposedChange } from "../runtime/proposal.js"
import type { TreeDelta } from "../tree/delta.js"

/**
 * Test doubles for the impure seams this file owns — the interpreter and its
 * repairer, the clock, and the event sink. The runtime's other two seams are
 * doubled where they are defined: `sequentialIdFactory` in `ids.ts` and
 * `fixedPolicy` in `runtime/policy-source.ts`.
 *
 * They live in `src/testing` rather than beside the tests because the renderer
 * and portal will want the same ones.
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

/**
 * A sink that fails on the events it was told to fail on and collects the rest,
 * so a test can assert both halves at once: that the change survived, and that
 * narration carried on past the failure rather than stopping at it.
 *
 * `mode` picks how it fails. A synchronous throw is the obvious shape; an
 * `async` sink assigned to a `() => void` signature rejects instead, which is
 * the shape a host reaches by accident (0042).
 */
export const failingEventSink = (
  failOn: readonly string[],
  mode: "throw" | "reject" = "throw"
): CollectingEventSink => {
  const envelopes: RuntimeEventEnvelope[] = []

  const fail = (type: string): void => {
    const error = new Error(`sink refused ${type}`)
    if (mode === "throw") throw error

    /** Typed `void`, returns a rejected promise: exactly the accidental case. */
    return Promise.reject(error) as unknown as void
  }

  return {
    emit: (envelope) => {
      if (failOn.includes(envelope.event.type)) return fail(envelope.event.type)

      envelopes.push(envelope)
    },
    envelopes,
    types: () => envelopes.map((envelope) => envelope.event.type),
  }
}

export type RecordingModelClient = ModelClient & {
  readonly requests: readonly ModelRequest[]
}

/**
 * A model that answers from a script and remembers what it was asked, so the
 * interpreter's request assembly and its reply handling can be tested
 * separately, and neither needs a network or a key.
 */
export const scriptedModelClient = (
  reply: string | Result<ModelCompletion, ModelClientError>,
  servedBy = "claude-test-1"
): RecordingModelClient => {
  const requests: ModelRequest[] = []
  const script = typeof reply === "string" ? ok({ text: reply, servedBy }) : reply

  return {
    complete: (request) => {
      requests.push(request)

      return Promise.resolve(script)
    },
    requests,
  }
}

export type RecordingInterpreter = ChangeInterpreter & {
  readonly intents: readonly EditIntent[]
}

/**
 * Returns whatever it was handed, so tests drive the pipeline from a fixed
 * script, and remembers what it was asked — which is how a test asserts that a
 * write refused before interpretation never spent a model call.
 */
export const scriptedInterpreter = (
  script: Result<ProposedChange, InterpretationError>
): RecordingInterpreter => {
  const intents: EditIntent[] = []

  return {
    interpret: (intent) => {
      intents.push(intent)

      return Promise.resolve(script)
    },
    intents,
  }
}

export type RecordingRepairer = ChangeRepairer & {
  readonly requests: readonly RepairRequest[]
}

/**
 * A repairer that answers from a script and remembers what it was asked, so a
 * test can assert both that the refusal reached it and that exactly one attempt
 * was made.
 */
export const scriptedRepairer = (
  script: Result<ProposedChange, InterpretationError>
): RecordingRepairer => {
  const requests: RepairRequest[] = []

  return {
    repair: (request) => {
      requests.push(request)

      return Promise.resolve(script)
    },
    requests,
  }
}

export type IntentDraft = {
  readonly treeId: TreeId
  readonly baseRevision: number
  readonly utterance?: string
  readonly origin?: IntentOrigin
  readonly actor?: string
}

export const buildIntent = (idFactory: IdFactory, draft: IntentDraft): EditIntent => ({
  intentId: idFactory.intentId(),
  treeId: draft.treeId,
  baseRevision: draft.baseRevision,
  origin: draft.origin ?? "user-instruction",
  ...(draft.actor === undefined ? {} : { actor: draft.actor }),
  utterance: draft.utterance ?? "make it better",
  observedAt: FIXED_INSTANT,
})

export type ProposalDraft = {
  readonly intentId: IntentId
  readonly delta: TreeDelta
  readonly rationale?: string
  readonly origin?: IntentOrigin
  readonly actor?: string
  readonly authoredBy?: AuthorKind
  readonly confidence?: number
}

export const buildProposal = (idFactory: IdFactory, draft: ProposalDraft): ProposedChange => ({
  proposalId: idFactory.proposalId(),
  intentId: draft.intentId,
  delta: draft.delta,
  rationale: draft.rationale ?? "satisfies the intent",
  provenance: {
    origin: draft.origin ?? "user-instruction",
    ...(draft.actor === undefined ? {} : { actor: draft.actor }),
    interpreter: "scripted",
    authoredBy: draft.authoredBy ?? "model",
    confidence: draft.confidence ?? 0.9,
    interpretedAt: FIXED_INSTANT,
  },
})
