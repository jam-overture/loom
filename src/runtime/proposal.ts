import { z } from "zod"

import { intentIdSchema, proposalIdSchema, type IntentId, type ProposalId } from "../ids.js"
import { treeDeltaSchema, type TreeDelta } from "../tree/delta.js"

import { intentOriginSchema, type IntentOrigin } from "./intent.js"

/**
 * Provenance answers "where did this change come from" in enough detail to
 * audit it later: who or what asked, which interpreter turned the ask into a
 * delta, and how sure that interpreter was. Telemetry consumes exactly this
 * record alongside the disposition and the eventual outcome.
 */
export const provenanceSchema = z.object({
  origin: intentOriginSchema,
  /**
   * The user or system component that raised the intent, carried from
   * `EditIntent.actor`. Opaque to the runtime: a host decides what an identity
   * looks like, and nothing here parses it (0027).
   */
  actor: z.string().min(1).optional(),
  /** Identifies what produced the delta — a model id, or a named component. */
  interpreter: z.string().min(1),
  /** Hash rather than the prompt itself, so provenance carries no user content. */
  promptHash: z.string().min(1).optional(),
  confidence: z.number().min(0).max(1),
  interpretedAt: z.string().datetime(),
})

export type Provenance = {
  readonly origin: IntentOrigin
  readonly actor?: string
  readonly interpreter: string
  readonly promptHash?: string
  readonly confidence: number
  readonly interpretedAt: string
}

/**
 * The unit the Gate reviews: a concrete delta, why the interpreter believes it
 * satisfies the intent, and where it came from. A proposal is inert — nothing
 * has touched the tree yet.
 */
export const proposedChangeSchema = z.object({
  proposalId: proposalIdSchema,
  intentId: intentIdSchema,
  delta: treeDeltaSchema,
  rationale: z.string().min(1),
  provenance: provenanceSchema,
  /**
   * Set when this proposal replaces one the Gate refused. Stamped by the
   * runtime rather than claimed by the proposer, so a weaker change offered
   * after a refusal cannot present itself as an unrelated first attempt.
   */
  repairOf: proposalIdSchema.optional(),
})

export type ProposedChange = {
  readonly proposalId: ProposalId
  readonly intentId: IntentId
  readonly delta: TreeDelta
  readonly rationale: string
  readonly provenance: Provenance
  readonly repairOf?: ProposalId
}
