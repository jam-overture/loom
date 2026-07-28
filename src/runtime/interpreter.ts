import type { Result } from "../result.js"
import type { LoomTree } from "../tree/tree.js"

import type { Disposition } from "./disposition.js"
import type { EditIntent } from "./intent.js"
import type { ProposedChange } from "./proposal.js"

/**
 * The AI seam.
 *
 * Interpretation is the one genuinely non-deterministic step in the pipeline,
 * so it sits behind an interface the rest of the runtime depends on but never
 * implements. Everything downstream — assessment, the Gate, application — is
 * pure and can be tested without a model in the loop.
 *
 * An interpreter may fail to produce a delta at all. That is a distinct outcome
 * from producing one the Gate rejects, and the two must not be conflated: the
 * first is "I did not understand", the second is "you may not do that".
 */

export type InterpretationError =
  | { readonly code: "not-understood"; readonly detail: string }
  | { readonly code: "no-change-needed"; readonly detail: string }
  | { readonly code: "interpreter-unavailable"; readonly detail: string }
  /**
   * The interpreter itself declined — a safety classifier, a content policy, a
   * guardrail of its own. Kept apart from `interpreter-unavailable` because one
   * is a statement about the request and the other is a statement about the
   * service: a rising rate of the first is a content signal, a rising rate of
   * the second is an outage.
   */
  | { readonly code: "refused"; readonly detail: string }
  | { readonly code: "malformed-proposal"; readonly detail: string }

export interface ChangeInterpreter {
  readonly interpret: (
    intent: EditIntent,
    tree: LoomTree
  ) => Promise<Result<ProposedChange, InterpretationError>>
}

/**
 * What a repairer is told: the intent that was raised, the proposal the Gate
 * refused, and the disposition that refused it. Deliberately the whole
 * disposition rather than a summary — a repairer that cannot see which rule
 * fired can only guess at what would be acceptable.
 */
export type RepairRequest = {
  readonly intent: EditIntent
  readonly refused: ProposedChange
  readonly disposition: Disposition
}

/**
 * Revising a refused proposal is a different job from interpreting an
 * utterance, so it is a different interface. A runtime that is handed no
 * repairer cannot repair, which makes "this deployment lets AI have a second
 * go" a visible choice at the composition root rather than a property of
 * whichever interpreter happened to be wired in.
 */
export interface ChangeRepairer {
  readonly repair: (
    request: RepairRequest,
    tree: LoomTree
  ) => Promise<Result<ProposedChange, InterpretationError>>
}
