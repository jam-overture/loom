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
 * Three failure modes, kept apart because they mean different things upstream:
 * `unavailable` is "ask again later", `refused` is "this model will not answer
 * this", and `incomplete` is "the answer was cut off mid-sentence" — which is a
 * malformed reply rather than a missing one.
 */
export type ModelClientError =
  | { readonly code: "unavailable"; readonly detail: string }
  | { readonly code: "refused"; readonly detail: string }
  | { readonly code: "incomplete"; readonly detail: string }

export interface ModelClient {
  readonly complete: (request: ModelRequest) => Promise<Result<ModelCompletion, ModelClientError>>
}
