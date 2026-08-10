import { assertNever, type Result } from "../result.js"
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
  /** The service could not answer now. The same request may succeed later. */
  | { readonly code: "interpreter-unavailable"; readonly detail: string }
  /**
   * This deployment cannot reach a model at all — no credential, no entitlement,
   * no billing. Kept apart from `interpreter-unavailable` because waiting never
   * fixes it: an operator does.
   */
  | { readonly code: "interpreter-misconfigured"; readonly detail: string }
  /**
   * The service rejected the request Loom assembled, and would reject the same
   * request again. This one is Loom's own fault, and it is the only failure here
   * that a deployment can neither wait out nor configure away.
   */
  | { readonly code: "interpreter-request-rejected"; readonly detail: string }
  /**
   * The interpreter itself declined — a safety classifier, a content policy, a
   * guardrail of its own. Kept apart from `interpreter-unavailable` because one
   * is a statement about the request and the other is a statement about the
   * service: a rising rate of the first is a content signal, a rising rate of
   * the second is an outage.
   */
  | { readonly code: "refused"; readonly detail: string }
  | { readonly code: "malformed-proposal"; readonly detail: string }

/**
 * Who would have to do something for the next attempt to go differently.
 *
 * Seven codes, five actors. A reader that switches on codes has to know all
 * seven and re-derive the grouping; a reader that switches on this cannot get
 * the grouping wrong, and gains nothing to update when an eighth code lands.
 *
 * Deliberately not a `retryable` boolean. Retrying is a policy — a host may
 * resample a `malformed-proposal` and reasonably refuse to resample anything
 * else — and a seam that answered "should you retry" would be deciding that
 * policy on the host's behalf while knowing less than the host does.
 */
export type InterpretationFault =
  /** The intent: nothing failed except the asking. */
  | "asker"
  /** The answer that came back. */
  | "model"
  /** The service, this time. */
  | "provider"
  /** The deployment, until someone changes it. */
  | "deployment"
  /** Loom, for what it sent. */
  | "runtime"

export const interpretationFault = (error: InterpretationError): InterpretationFault => {
  switch (error.code) {
    case "not-understood":
    case "no-change-needed":
      return "asker"
    case "refused":
    case "malformed-proposal":
      return "model"
    case "interpreter-unavailable":
      return "provider"
    case "interpreter-misconfigured":
      return "deployment"
    case "interpreter-request-rejected":
      return "runtime"
    default:
      return assertNever(error, "interpretationFault")
  }
}

/**
 * One sentence a reader who is not holding this union in their head can act on.
 *
 * Every sentence says what happens if nothing changes, because that is the part
 * a code alone never carried: two of these clear on their own and three do not.
 */
export const describeInterpretationError = (error: InterpretationError): string => {
  switch (error.code) {
    case "not-understood":
      return `the request was not understood: ${error.detail}`
    case "no-change-needed":
      return `nothing needed to change: ${error.detail}`
    case "interpreter-unavailable":
      return `the model could not be reached, and may answer later: ${error.detail}`
    case "interpreter-misconfigured":
      return `this deployment cannot reach a model until an operator changes that: ${error.detail}`
    case "interpreter-request-rejected":
      return `the model service rejected the request, and would reject it again unchanged: ${error.detail}`
    case "refused":
      return `the model declined to answer: ${error.detail}`
    case "malformed-proposal":
      return `the model's answer could not be used: ${error.detail}`
    default:
      return assertNever(error, "describeInterpretationError")
  }
}

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
