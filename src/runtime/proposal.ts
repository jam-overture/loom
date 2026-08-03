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

/**
 * Who wrote the delta, as opposed to which component carried it.
 *
 * `interpreter` names the thing; this names its kind, and the difference is
 * load-bearing. `confidence` is a self-grade, and only a model grades itself —
 * a delta the runtime computed (an inverse, say) has no opinion to be right or
 * wrong about. Calibration (0031) measures self-grades, so it has to be able to
 * tell the two apart by type rather than by recognising a magic interpreter
 * name.
 */
export const authorKindSchema = z.enum(["model", "runtime"])
export type AuthorKind = z.infer<typeof authorKindSchema>

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
  /**
   * Defaulted rather than required, because every provenance written before
   * this field existed was a model's. Absence means "recorded before the
   * runtime authored anything", and that reading stays true forever.
   */
  authoredBy: authorKindSchema.default("model"),
  /** Hash rather than the prompt itself, so provenance carries no user content. */
  promptHash: z.string().min(1).optional(),
  confidence: z.number().min(0).max(1),
  interpretedAt: z.string().datetime(),
})

export type Provenance = {
  readonly origin: IntentOrigin
  readonly actor?: string
  readonly interpreter: string
  readonly authoredBy: AuthorKind
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
