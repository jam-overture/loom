import { z } from "zod"

import {
  intentIdSchema,
  nodeIdSchema,
  proposalIdSchema,
  type IntentId,
  type NodeId,
  type ProposalId,
} from "../ids.js"
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
 * a delta the runtime computed, such as the inverse behind a revert, has no
 * opinion to be right or wrong about. Calibration (0031) measures self-grades,
 * so it has to tell the two apart by type rather than by recognising a magic
 * interpreter name.
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
  /**
   * The revision this change puts back, when it puts one back.
   *
   * `interpreter` already says *that* a change is an undo — `loom/revert` is a
   * name a surface can read, which is the whole reason it is a stamp rather than
   * a sentence. This says *which*, and it is here rather than on the proposal
   * because provenance is the part of a proposal a log keeps (`StoredRevision`).
   * A surface reading a log it did not write is exactly the reader that has no
   * other way to know, and the one this was filed for.
   *
   * Before it existed the link was real but only ever narrated: `utterance` said
   * `Undo revision 1.` and the rationale said so again in a longer sentence. Both
   * are composed for people, and a surface needing the link had to parse prose it
   * does not own — the thing the interpreter stamp exists to avoid — or carry the
   * number itself, which only the caller that asked for the undo can do.
   *
   * Optional, and absent on every change that is not an undo. Absence therefore
   * means "this puts nothing back", which is true of the whole log written before
   * the field existed as well.
   */
  undoes: z.number().int().positive().optional(),
  confidence: z.number().min(0).max(1),
  interpretedAt: z.string().datetime(),
})

export type Provenance = {
  readonly origin: IntentOrigin
  readonly actor?: string
  readonly interpreter: string
  readonly authoredBy: AuthorKind
  readonly promptHash?: string
  /** The revision this change puts back; absent unless it puts one back. */
  readonly undoes?: number
  readonly confidence: number
  readonly interpretedAt: string
}

/**
 * Work a change would take out of the current tree that its own delta does not
 * show: a revision already in the log, and which of the nodes it named this
 * change writes over.
 *
 * The delta is self-contained by construction (0001), which is what makes it
 * individually reviewable — and is also why it cannot express this. "Set this
 * text back to what it was" and "set this text back to what it was, discarding
 * what two people wrote afterwards" are the same four operations. Only something
 * holding the log can tell them apart, so whatever computed the delta from a log
 * says so here.
 *
 * Nothing is lost from the record when this is applied. The discarded revisions
 * stay in the log and the tree they made can be restored by undoing the undo,
 * which is why this raises stakes rather than making a change irreversible.
 */
export const discardedWorkSchema = z.object({
  revision: z.number().int().positive(),
  nodeIds: z.array(nodeIdSchema).min(1),
})

export type DiscardedWork = {
  readonly revision: number
  readonly nodeIds: readonly NodeId[]
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
  /**
   * Optional and absent by default: a proposal that declares nothing is one
   * whose author had no log to consult, which is every proposal a model makes.
   * Absence therefore means "not declared" rather than "nothing discarded", and
   * that reading stays true forever (0035).
   */
  discards: z.array(discardedWorkSchema).optional(),
})

export type ProposedChange = {
  readonly proposalId: ProposalId
  readonly intentId: IntentId
  readonly delta: TreeDelta
  readonly rationale: string
  readonly provenance: Provenance
  readonly repairOf?: ProposalId
  /**
   * Only ever set by an interpreter that computed the delta from a log. It can
   * make the Gate stricter and never more permissive, which is what makes it
   * safe to accept as a declaration rather than a computation the Gate repeats
   * (0035).
   */
  readonly discards?: readonly DiscardedWork[]
}
