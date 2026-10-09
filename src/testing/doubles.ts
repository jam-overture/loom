import { z } from "zod"

import { defineSource, type SourceEntry } from "../data/adapter.js"
import type { JsonValue } from "../json.js"
import type {
  ModelClient,
  ModelClientError,
  ModelCompletion,
  ModelRequest,
} from "../interpretation/client.js"
import type { IdFactory, IntentId, TreeId } from "../ids.js"
import { ok, type Result } from "../result.js"
import type { ChangeAnalysis } from "../runtime/analysis.js"
import type { ChangeAssessment } from "../runtime/assessment.js"
import { canonicalChecksOf, type WriteCheck } from "../runtime/checks.js"
import type { Clock, EventSink, RuntimeEventEnvelope } from "../runtime/events.js"
import type { EditIntent, IntentOrigin } from "../runtime/intent.js"
import type {
  ChangeInterpreter,
  ChangeRepairer,
  InterpretationError,
  RepairRequest,
} from "../runtime/interpreter.js"
import type { AuthorKind, ProposedChange } from "../runtime/proposal.js"
import type { IrreversibilityReason } from "../runtime/reversibility.js"
import { highestStake } from "../runtime/stake-level.js"
import type { StakeFactor } from "../runtime/stakes.js"
import { defineEndpoint, type EndpointEntry } from "../submit/endpoint.js"
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

export type HangingModelClient = ModelClient & {
  /** Whether the runtime's ceiling aborted the call, and what it said (0140). */
  readonly abortedWith: () => string | undefined
}

/**
 * A model that never answers — the failure mode a `try`/`catch` cannot see and
 * the reason `modelInterpreter` has a ceiling (0140).
 *
 * Published because every surface with a prompt box has an "it did not come
 * back" state to show, and this is the only way to reach it without waiting for
 * one. Use it with a small `ceilingMs`: a test that needs three minutes to pass
 * is a test nobody runs.
 */
export const hangingModelClient = (): HangingModelClient => {
  let aborted: string | undefined

  return {
    complete: (_request, options) =>
      new Promise(() => {
        options?.signal?.addEventListener("abort", () => {
          const { reason } = options.signal as AbortSignal
          aborted = reason instanceof Error ? reason.message : "unnamed"
        })
      }),
    abortedWith: () => aborted,
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

/**
 * What a hanging seam double reports, beside the entry a registry takes.
 *
 * The `abortedWith` half is the reason these are published rather than written
 * out per surface: reaching a ceiling is observable in the seam's own
 * vocabulary, but the *abort* the runtime sends afterwards is not observable
 * anywhere except from inside the adapter, and it is the half a hand-written
 * double leaves out (0140).
 */
export type HangingSeam<TEntry> = {
  readonly entry: TEntry
  /** Whether the runtime's ceiling aborted the call, and what it said (0140). */
  readonly abortedWith: () => string | undefined
}

/**
 * Records what an abort said, in the one shape all three seams hand it over in.
 */
const abortRecorder = () => {
  let aborted: string | undefined

  return {
    read: () => aborted,
    listen: (signal: AbortSignal | undefined) => {
      signal?.addEventListener("abort", () => {
        const { reason } = signal

        aborted = reason instanceof Error ? reason.message : "unnamed"
      })
    },
  }
}

/**
 * A source that never answers — the sibling of `hangingModelClient` at the data
 * seam, published for the same reason.
 *
 * Every surface that renders a bound region has an "it did not come back" state
 * to show, and a promise that is never resolved is the only honest imitation of
 * an integration nobody is going to answer. Use it with a small `ceilingMs`;
 * the default is ten seconds and a test that waits it out is a test nobody runs.
 *
 * Its params schema accepts anything, because a double whose whole job is to
 * not answer must never be the thing that refuses first: a binding written
 * against the real source it stands in for has to reach the adapter unchanged.
 */
export const hangingSource = (id: string, description: string): HangingSeam<SourceEntry> => {
  const abort = abortRecorder()

  return {
    entry: defineSource({
      id,
      description,
      params: z.object({}).passthrough(),
      answers: z.custom<JsonValue>(),
      adapter: {
        fetch: ({ signal }) =>
          new Promise(() => {
            abort.listen(signal)
          }),
      },
    }),
    abortedWith: abort.read,
  }
}

/**
 * An endpoint that never says where a form posts — the same double at the
 * submission seam.
 *
 * A form's target is resolved while the page is being served, so this is the
 * state a token store having a very bad afternoon puts a page into, and the one
 * a ceiling exists to bound (0140).
 */
export const hangingEndpoint = (id: string, description: string): HangingSeam<EndpointEntry> => {
  const abort = abortRecorder()

  return {
    entry: defineEndpoint({
      id,
      description,
      endpoint: {
        target: ({ signal }) =>
          new Promise(() => {
            abort.listen(signal)
          }),
      },
    }),
    abortedWith: abort.read,
  }
}

/**
 * Every fact an analysis states, measuring nothing.
 *
 * The whole of why `buildAssessment` exists is in this one declaration: a field
 * added to `ChangeAnalysis` stops it compiling, here, in the lane that added
 * the field. A surface's fixture that spelled the record out itself would
 * instead keep compiling and start lying — ten of eighteen fields, the gap cast
 * away, and the failure arriving later in whichever test is the next to narrow
 * one of the eight it left out.
 */
export const NOTHING_MEASURED: ChangeAnalysis = {
  operationCount: 0,
  insertedNodeCount: 0,
  removedNodeCount: 0,
  movedNodeCount: 0,
  configuredNodeCount: 0,
  relocatedNodeCount: 0,
  affectedNodeIds: [],
  touchedPrimitiveTypes: [],
  relocatedPrimitiveTypes: [],
  removedPrimitiveTypes: [],
  configuredPropKeys: [],
  nestedTargets: [],
  unknownPrimitives: [],
  invalidProps: [],
  unreadBindings: [],
  redirectedSubmissions: [],
  repointedBindings: [],
  shallowestAffectedDepth: 0,
}

/**
 * The facts a test wants to be true of a judged change. Everything else is
 * absent, empty or zero.
 *
 * What is *not* here is the point. A level, a reversible flag, a retained count
 * and an inverse delta are all computed below from what this draft says,
 * because each of the four is something the runtime derives and none is
 * something a caller may contradict. The Gate's level is the highest of its
 * factors; a change is reversible exactly when nothing says otherwise; the
 * inverse retains what a removal destroyed. A draft that could set them
 * independently could describe an assessment no run of Loom will ever produce,
 * which is the one thing a published double must not let a test assert against.
 */
export type AssessmentDraft = {
  /** The change being judged. Its delta decides what the inverse is written against. */
  readonly proposal: ProposedChange
  /** What the delta does. The fields left out measure zero. */
  readonly analysis?: Partial<ChangeAnalysis>
  /** The rules the Gate raised, in the order it raised them. */
  readonly factors?: readonly StakeFactor[]
  /** Why the change cannot be taken back. Empty means it can. */
  readonly irreversibilityReasons?: readonly IrreversibilityReason[]
  /**
   * Which of the write path's optional checks were in place. Empty by default,
   * which is what a double has wired: the real seams need a registry, and a
   * fixture claiming a check it never performed would put a reader's confidence
   * in the wrong place.
   */
  readonly wiredChecks?: readonly WriteCheck[]
}

/**
 * A complete `ChangeAssessment` from the handful of facts a test cares about.
 *
 * The third double of its kind and the first that had to be asked for. A
 * surface needing one of these had two options and both are bad: run
 * `assessChange` against a real tree, which means owning a tree and a registry
 * to get at a number; or write the record out as a literal and cast the gap
 * away, which is what three fixtures across two lanes did until a field was
 * added underneath them.
 *
 * It is not `assessChange` and does not pretend to be. The real one measures a
 * delta against a tree, so reaching a particular factor through it means
 * crafting a delta that raises exactly that rule — which is the right test for
 * the Gate and the wrong one for a screen that only needs a critical change to
 * draw. This builds the record directly and keeps the three invariants that
 * make the record coherent.
 */
export const buildAssessment = (
  idFactory: IdFactory,
  draft: AssessmentDraft
): ChangeAssessment => {
  const analysis: ChangeAnalysis = { ...NOTHING_MEASURED, ...draft.analysis }
  const factors = draft.factors ?? []
  const reasons = draft.irreversibilityReasons ?? []

  return {
    proposal: draft.proposal,
    analysis,
    stakes: { level: highestStake(factors.map((factor) => factor.level)), factors },
    reversibility: {
      reversible: reasons.length === 0,
      inverse: {
        deltaId: idFactory.deltaId(),
        treeId: draft.proposal.delta.treeId,
        baseRevision: draft.proposal.delta.baseRevision + 1,
        operations: [],
      },
      retainedNodeCount: analysis.removedNodeCount,
      reasons,
    },
    wiredChecks: canonicalChecksOf(draft.wiredChecks ?? []),
  }
}
