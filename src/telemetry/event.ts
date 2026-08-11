import { z } from "zod"

import {
  intentIdSchema,
  nodeIdSchema,
  proposalIdSchema,
  treeIdSchema,
  type IntentId,
  type NodeId,
  type ProposalId,
  type TreeId,
} from "../ids.js"
import { primitiveTypeSchema, type PrimitiveType } from "../primitive-type.js"
import { assertNever } from "../result.js"
import type { ChangeAssessment } from "../runtime/assessment.js"
import {
  dispositionReasonSchema,
  dispositionSchema,
  type Disposition,
  type DispositionReason,
} from "../runtime/disposition.js"
import type { RuntimeEvent, RuntimeEventEnvelope } from "../runtime/events.js"
import { intentOriginSchema, type EditIntent, type IntentOrigin } from "../runtime/intent.js"
import { policyFingerprintOf } from "../runtime/policy-fingerprint.js"
import { proposedChangeSchema, type ProposedChange } from "../runtime/proposal.js"
import { stakeLevelSchema, type StakeLevel } from "../runtime/stake-level.js"
import { describeStoreError } from "../store/errors.js"
import { describeTreeError } from "../tree/errors.js"

/**
 * What §6 keeps, and what it deliberately does not.
 *
 * A `RuntimeEvent` is the runtime talking to itself in a single process: it
 * carries whole assessments and whole inverse deltas because the next stage
 * needs them. A telemetry record is what survives the request, so it is a
 * narrowing of that stream rather than a copy of it (0023). Three rules decide
 * what crosses:
 *
 * - **The delta of a proposal is kept.** For a change that was refused, held and
 *   discarded, or never applied, this journal is the only record it ever
 *   existed — the revision log by construction holds only what was applied.
 * - **Anything the log already holds is dropped.** An applied change's inverse
 *   is in the log with its provenance, and storing it twice invites two stores
 *   to disagree about the same delta.
 * - **The utterance is not kept.** Telemetry is retained and aggregated; what
 *   someone typed is content, and provenance's `promptHash` already exists for
 *   hosts that want to group identical asks without keeping their text.
 *
 * The event names mirror `RuntimeEvent` one for one. A stage the runtime
 * narrates but telemetry silently discarded would be a stage nobody could prove
 * ran, so narrowing changes payloads and never membership.
 *
 * A field added after records exist is **optional and never defaulted** (0045).
 * A record written before a field existed did not decline to say it — it could
 * not, and a default would put a number in its mouth.
 */

/**
 * A failure, as telemetry stores it: the code, and a sentence the runtime wrote
 * about it. `code` is an open string rather than a mirror of §1/§2/§5's error
 * taxonomies on purpose — adding an error code somewhere else in the codebase
 * must not make records written yesterday fail to parse today.
 */
export const telemetryFailureSchema = z.object({
  code: z.string().min(1),
  detail: z.string().min(1),
})

export type TelemetryFailure = {
  readonly code: string
  readonly detail: string
}

/**
 * The intent, minus what was said. Origin, scope and the revision it was aimed
 * at are what an analysis needs; `utteranceLength` keeps "a one-word ask" and
 * "three paragraphs" distinguishable without storing either.
 *
 * `actor` is kept for the same reason `origin` is: it is an identifier a query
 * groups by, not content someone typed. The rule 0023 set is about the
 * utterance, and an identity is on the other side of it.
 */
export const intentSummarySchema = z.object({
  intentId: intentIdSchema,
  origin: intentOriginSchema,
  actor: z.string().min(1).optional(),
  baseRevision: z.number().int().nonnegative(),
  scopeNodeId: nodeIdSchema.optional(),
  utteranceLength: z.number().int().nonnegative(),
  observedAt: z.string().datetime(),
})

export type IntentSummary = {
  readonly intentId: IntentId
  readonly origin: IntentOrigin
  readonly actor?: string
  readonly baseRevision: number
  readonly scopeNodeId?: NodeId
  readonly utteranceLength: number
  readonly observedAt: string
}

/**
 * What the Gate was looking at, in the shape a query can group by. The
 * disposition that follows says stakes, reversibility and confidence; this says
 * how big the change was and what it touched, which is what makes "the Gate
 * refuses this class of change" measurable rather than anecdotal.
 */
export const assessmentSummarySchema = z.object({
  proposalId: proposalIdSchema,
  stakes: stakeLevelSchema,
  reversible: z.boolean(),
  operationCount: z.number().int().nonnegative(),
  insertedNodeCount: z.number().int().nonnegative(),
  removedNodeCount: z.number().int().nonnegative(),
  movedNodeCount: z.number().int().nonnegative(),
  configuredNodeCount: z.number().int().nonnegative(),
  touchedPrimitiveTypes: z.array(primitiveTypeSchema),
  /**
   * Bounded, non-identifying, a subset of the touched types, and the input to
   * the only `critical` stake factor. A corpus that cannot group by "the Gate
   * saw this type destroyed" cannot ask the question the factor exists for.
   */
  removedPrimitiveTypes: z.array(primitiveTypeSchema).optional(),
  relocatedPrimitiveTypes: z.array(primitiveTypeSchema).optional(),
  relocatedNodeCount: z.number().int().nonnegative().optional(),
  shallowestAffectedDepth: z.number().int().nonnegative(),
  /** Nodes the inverse would have to carry — the content a removal destroyed. */
  retainedNodeCount: z.number().int().nonnegative(),
  irreversibilityReasons: z.array(z.string().min(1)),
})

export type AssessmentSummary = {
  readonly proposalId: ProposalId
  readonly stakes: StakeLevel
  readonly reversible: boolean
  readonly operationCount: number
  readonly insertedNodeCount: number
  readonly removedNodeCount: number
  readonly movedNodeCount: number
  readonly configuredNodeCount: number
  readonly touchedPrimitiveTypes: readonly PrimitiveType[]
  /** Absent on a record written before the field existed, never defaulted (0045). */
  readonly removedPrimitiveTypes?: readonly PrimitiveType[]
  readonly relocatedPrimitiveTypes?: readonly PrimitiveType[]
  readonly relocatedNodeCount?: number
  readonly shallowestAffectedDepth: number
  readonly retainedNodeCount: number
  readonly irreversibilityReasons: readonly string[]
}

export const telemetryEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("intent-received"), intent: intentSummarySchema }),
  z.object({
    type: z.literal("policy-resolved"),
    intentId: intentIdSchema,
    policyId: z.string().min(1),
    policyFingerprint: z.string().min(1).optional(),
  }),
  z.object({
    type: z.literal("interpretation-failed"),
    intentId: intentIdSchema,
    failure: telemetryFailureSchema,
  }),
  z.object({ type: z.literal("change-proposed"), proposal: proposedChangeSchema }),
  z.object({
    type: z.literal("assessment-failed"),
    proposalId: proposalIdSchema,
    failure: telemetryFailureSchema,
  }),
  z.object({ type: z.literal("change-assessed"), assessment: assessmentSummarySchema }),
  z.object({
    type: z.literal("disposition-decided"),
    proposalId: proposalIdSchema,
    disposition: dispositionSchema,
  }),
  z.object({
    type: z.literal("repair-requested"),
    refusedProposalId: proposalIdSchema,
    reason: dispositionReasonSchema,
  }),
  z.object({
    type: z.literal("repair-failed"),
    refusedProposalId: proposalIdSchema,
    failure: telemetryFailureSchema,
  }),
  z.object({
    type: z.literal("change-applied"),
    proposalId: proposalIdSchema,
    revision: z.number().int().nonnegative(),
  }),
  z.object({
    type: z.literal("application-failed"),
    proposalId: proposalIdSchema,
    failure: telemetryFailureSchema,
  }),
  z.object({
    type: z.literal("intent-not-writable"),
    intentId: intentIdSchema,
    failure: telemetryFailureSchema,
  }),
  z.object({ type: z.literal("proposal-held"), proposalId: proposalIdSchema }),
  z.object({
    type: z.literal("hold-failed"),
    proposalId: proposalIdSchema,
    failure: telemetryFailureSchema,
  }),
  z.object({
    type: z.literal("hold-confirmed"),
    proposalId: proposalIdSchema,
    actor: z.string().min(1).optional(),
  }),
  z.object({
    type: z.literal("hold-discarded"),
    proposalId: proposalIdSchema,
    actor: z.string().min(1).optional(),
  }),
  z.object({
    type: z.literal("change-committed"),
    proposalId: proposalIdSchema,
    revision: z.number().int().nonnegative(),
  }),
  z.object({
    type: z.literal("commit-failed"),
    proposalId: proposalIdSchema,
    failure: telemetryFailureSchema,
  }),
])

export type TelemetryEvent =
  | { readonly type: "intent-received"; readonly intent: IntentSummary }
  | {
      readonly type: "policy-resolved"
      readonly intentId: IntentId
      readonly policyId: string
      /** Absent on a record written before the Gate fingerprinted policies (0045). */
      readonly policyFingerprint?: string
    }
  | {
      readonly type: "interpretation-failed"
      readonly intentId: IntentId
      readonly failure: TelemetryFailure
    }
  | { readonly type: "change-proposed"; readonly proposal: ProposedChange }
  | {
      readonly type: "assessment-failed"
      readonly proposalId: ProposalId
      readonly failure: TelemetryFailure
    }
  | { readonly type: "change-assessed"; readonly assessment: AssessmentSummary }
  | {
      readonly type: "disposition-decided"
      readonly proposalId: ProposalId
      readonly disposition: Disposition
    }
  | {
      readonly type: "repair-requested"
      readonly refusedProposalId: ProposalId
      readonly reason: DispositionReason
    }
  | {
      readonly type: "repair-failed"
      readonly refusedProposalId: ProposalId
      readonly failure: TelemetryFailure
    }
  | { readonly type: "change-applied"; readonly proposalId: ProposalId; readonly revision: number }
  | {
      readonly type: "application-failed"
      readonly proposalId: ProposalId
      readonly failure: TelemetryFailure
    }
  | {
      readonly type: "intent-not-writable"
      readonly intentId: IntentId
      readonly failure: TelemetryFailure
    }
  | { readonly type: "proposal-held"; readonly proposalId: ProposalId }
  | {
      readonly type: "hold-failed"
      readonly proposalId: ProposalId
      readonly failure: TelemetryFailure
    }
  | { readonly type: "hold-confirmed"; readonly proposalId: ProposalId; readonly actor?: string }
  | { readonly type: "hold-discarded"; readonly proposalId: ProposalId; readonly actor?: string }
  | { readonly type: "change-committed"; readonly proposalId: ProposalId; readonly revision: number }
  | {
      readonly type: "commit-failed"
      readonly proposalId: ProposalId
      readonly failure: TelemetryFailure
    }

export const telemetryRecordSchema = z.object({
  treeId: treeIdSchema,
  occurredAt: z.string().datetime(),
  event: telemetryEventSchema,
})

export type TelemetryRecord = {
  readonly treeId: TreeId
  readonly occurredAt: string
  readonly event: TelemetryEvent
}

const summariseIntent = (intent: EditIntent): IntentSummary => ({
  intentId: intent.intentId,
  origin: intent.origin,
  ...(intent.actor === undefined ? {} : { actor: intent.actor }),
  baseRevision: intent.baseRevision,
  ...(intent.scopeNodeId ? { scopeNodeId: intent.scopeNodeId } : {}),
  utteranceLength: intent.utterance.length,
  observedAt: intent.observedAt,
})

const summariseAssessment = (assessment: ChangeAssessment): AssessmentSummary => ({
  proposalId: assessment.proposal.proposalId,
  stakes: assessment.stakes.level,
  reversible: assessment.reversibility.reversible,
  operationCount: assessment.analysis.operationCount,
  insertedNodeCount: assessment.analysis.insertedNodeCount,
  removedNodeCount: assessment.analysis.removedNodeCount,
  movedNodeCount: assessment.analysis.movedNodeCount,
  configuredNodeCount: assessment.analysis.configuredNodeCount,
  touchedPrimitiveTypes: assessment.analysis.touchedPrimitiveTypes,
  removedPrimitiveTypes: assessment.analysis.removedPrimitiveTypes,
  relocatedPrimitiveTypes: assessment.analysis.relocatedPrimitiveTypes,
  relocatedNodeCount: assessment.analysis.relocatedNodeCount,
  shallowestAffectedDepth: assessment.analysis.shallowestAffectedDepth,
  retainedNodeCount: assessment.reversibility.retainedNodeCount,
  irreversibilityReasons: assessment.reversibility.reasons.map((reason) => reason.code),
})

/**
 * The narrowing, as one total function. Every variant is handled and the
 * exhaustiveness guard is what makes adding a `RuntimeEvent` a compile error
 * here rather than an event that silently never reaches the journal.
 */
const narrowEvent = (event: RuntimeEvent): TelemetryEvent => {
  switch (event.type) {
    case "intent-received":
      return { type: "intent-received", intent: summariseIntent(event.intent) }

    /**
     * The name crosses; the values do not. A policy is host configuration that
     * changes rarely and is versioned where the host keeps it, so copying it
     * onto every change would store one document a million times to answer a
     * question the name already answers.
     *
     * The fingerprint is what makes that contract checkable rather than merely
     * stated (0048). It is a digest, not the document: bounded, and it answers
     * "did this name keep meaning one thing" without keeping a copy of the
     * configuration on every change.
     */
    case "policy-resolved":
      return {
        type: "policy-resolved",
        intentId: event.intentId,
        policyId: event.policy.policyId,
        policyFingerprint: policyFingerprintOf(event.policy),
      }

    case "interpretation-failed":
      return {
        type: "interpretation-failed",
        intentId: event.intent.intentId,
        failure: { code: event.error.code, detail: event.error.detail },
      }

    case "change-proposed":
      return { type: "change-proposed", proposal: event.proposal }

    case "assessment-failed":
      return {
        type: "assessment-failed",
        proposalId: event.proposal.proposalId,
        failure: { code: event.error.code, detail: describeTreeError(event.error) },
      }

    case "change-assessed":
      return { type: "change-assessed", assessment: summariseAssessment(event.assessment) }

    case "disposition-decided":
      return {
        type: "disposition-decided",
        proposalId: event.proposalId,
        disposition: event.disposition,
      }

    case "repair-requested":
      return {
        type: "repair-requested",
        refusedProposalId: event.refusedProposalId,
        reason: event.reason,
      }

    case "repair-failed":
      return {
        type: "repair-failed",
        refusedProposalId: event.refusedProposalId,
        failure: { code: event.error.code, detail: event.error.detail },
      }

    /** The inverse is dropped: it is in the log, attached to the revision named here. */
    case "change-applied":
      return { type: "change-applied", proposalId: event.proposalId, revision: event.revision }

    case "application-failed":
      return {
        type: "application-failed",
        proposalId: event.proposalId,
        failure: { code: event.error.code, detail: describeTreeError(event.error) },
      }

    case "intent-not-writable":
      return {
        type: "intent-not-writable",
        intentId: event.intent.intentId,
        failure: { code: event.error.code, detail: describeStoreError(event.error) },
      }

    case "proposal-held":
      return { type: "proposal-held", proposalId: event.proposalId }

    case "hold-failed":
      return {
        type: "hold-failed",
        proposalId: event.proposalId,
        failure: { code: "hold-failed", detail: event.detail },
      }

    case "hold-confirmed":
      return {
        type: "hold-confirmed",
        proposalId: event.proposalId,
        ...(event.actor === undefined ? {} : { actor: event.actor }),
      }

    case "hold-discarded":
      return {
        type: "hold-discarded",
        proposalId: event.proposalId,
        ...(event.actor === undefined ? {} : { actor: event.actor }),
      }

    case "change-committed":
      return { type: "change-committed", proposalId: event.proposalId, revision: event.revision }

    case "commit-failed":
      return {
        type: "commit-failed",
        proposalId: event.proposalId,
        failure: { code: event.error.code, detail: describeStoreError(event.error) },
      }

    default:
      return assertNever(event, "narrowEvent")
  }
}

export const recordOf = (envelope: RuntimeEventEnvelope): TelemetryRecord => ({
  treeId: envelope.treeId,
  occurredAt: envelope.occurredAt,
  event: narrowEvent(envelope.event),
})

/**
 * The proposal an event is about, when it is about one. Used by the fold rather
 * than stored as a column: a query that needs an index on it is a change with a
 * reason behind it, and duplicating a field into a column is how two copies of
 * the same fact start disagreeing.
 */
export const proposalIdOf = (event: TelemetryEvent): ProposalId | undefined => {
  switch (event.type) {
    case "change-proposed":
      return event.proposal.proposalId
    case "change-assessed":
      return event.assessment.proposalId
    case "repair-requested":
    case "repair-failed":
      return event.refusedProposalId
    case "assessment-failed":
    case "disposition-decided":
    case "change-applied":
    case "application-failed":
    case "proposal-held":
    case "hold-failed":
    case "hold-confirmed":
    case "hold-discarded":
    case "change-committed":
    case "commit-failed":
      return event.proposalId
    case "intent-received":
    case "policy-resolved":
    case "interpretation-failed":
    case "intent-not-writable":
      return undefined
    default:
      return assertNever(event, "proposalIdOf")
  }
}

/** The intent an event names directly. Everything else reaches one via its proposal. */
export const intentIdOf = (event: TelemetryEvent): IntentId | undefined => {
  switch (event.type) {
    case "intent-received":
      return event.intent.intentId
    case "policy-resolved":
    case "interpretation-failed":
    case "intent-not-writable":
      return event.intentId
    case "change-proposed":
      return event.proposal.intentId
    default:
      return undefined
  }
}
