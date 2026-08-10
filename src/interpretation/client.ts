import type { JsonObject } from "../json.js"
import type { Result } from "../result.js"

/**
 * The network boundary, and nothing else.
 *
 * Everything an interpreter does — assembling the request, parsing the reply,
 * validating the delta, deciding what a malformed answer means — sits above
 * this interface and is therefore testable with no network and no credentials.
 * A `ModelClient` implementation is allowed to do exactly one thing: turn a
 * request into text or into a reason it could not.
 */

export type ModelEffort = "low" | "medium" | "high" | "xhigh" | "max"

export type ModelRequest = {
  readonly model: string
  readonly maxTokens: number
  readonly effort: ModelEffort
  readonly system: string
  readonly userMessage: string
  /** JSON Schema the reply is constrained to. */
  readonly outputSchema: JsonObject
}

export type ModelCompletion = {
  /** The reply body, expected to be JSON matching `outputSchema`. */
  readonly text: string
  /** The model that actually served the request, which may differ from the one asked for. */
  readonly servedBy: string
}

/**
 * Five failure modes, kept apart because each names a different actor — the one
 * who would have to do something for the next attempt to go differently.
 *
 * - `unavailable` — the service could not answer now. Nobody has to act; the
 *   same request may succeed later.
 * - `rejected` — the service refused the request itself. Repeating it unchanged
 *   fails identically, so what has to change is the request, which is Loom's.
 * - `misconfigured` — this deployment may not talk to this model at all:
 *   credentials, entitlement, billing. An operator has to act.
 * - `refused` — the model would not answer this content.
 * - `incomplete` — the answer was cut off mid-sentence, which is a malformed
 *   reply rather than a missing one.
 *
 * The first three were one code until day 37. Collapsing them meant a request
 * the API rejected outright was reported as "ask again later", which is a lie
 * downstream cannot detect and cannot recover from.
 */
export type ModelClientError =
  | { readonly code: "unavailable"; readonly detail: string }
  | { readonly code: "rejected"; readonly detail: string }
  | { readonly code: "misconfigured"; readonly detail: string }
  | { readonly code: "refused"; readonly detail: string }
  | { readonly code: "incomplete"; readonly detail: string }

export interface ModelClient {
  readonly complete: (request: ModelRequest) => Promise<Result<ModelCompletion, ModelClientError>>
}
