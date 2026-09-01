import { z } from "zod"

import { NAMESPACED_ID_PATTERN } from "../primitive-type.js"
import type { JsonObject } from "../json.js"
import { err, ok, type Result } from "../result.js"

/**
 * The host's half of the submission seam: where a form's contents go.
 *
 * A data source answers a question the tree asked. An endpoint is the other
 * direction — it is where a *visitor's* data is sent — and that difference is
 * the whole reason this is a separate seam rather than a source that happens to
 * answer with a URL. A read that goes to the wrong place shows the wrong page;
 * a write that goes to the wrong place sends someone's name, email and message
 * to whoever owns that address.
 *
 * So the address is never in the tree. A proposal may name an endpoint the
 * deployment registered and may do nothing else: it cannot compose one, cannot
 * append to one, and cannot pass anything that reaches one. The registry is the
 * allowlist, exactly as it is for sources and for primitives.
 */

/**
 * The identifier of a registered endpoint — the contract between `loom:submit`
 * in the tree and whatever receives the submission. `contact.enquiry`,
 * `newsletter.subscribe`.
 */
export const endpointIdSchema = z.string().regex(NAMESPACED_ID_PATTERN).brand<"EndpointId">()
export type EndpointId = z.infer<typeof endpointIdSchema>

/**
 * A hidden input the primitive must render inside the form. A CSRF token is the
 * reason this exists, and it is the reason resolution is allowed to be slow: a
 * token is minted per request, often against a store, and a seam that could not
 * wait for one would push every host into minting it somewhere else and
 * threading it through `context` by hand.
 */
export type SubmissionField = {
  readonly name: string
  readonly value: string
}

/**
 * Where a form posts, as the primitive receives it. Every field here is
 * host-authored; none of it is in the tree, and none of it survives into a
 * delta, a revision or a diff.
 */
export type SubmissionTarget = {
  readonly action: string
  readonly method: "get" | "post"
  /** Rendered as hidden inputs, in order. Empty for an endpoint needing none. */
  readonly fields: readonly SubmissionField[]
}

/**
 * A path that stays on this origin, as distinct from one that merely starts
 * with a slash.
 *
 * `//host` is scheme-relative: it begins with `/` and reaches another origin
 * entirely, so a check for a leading slash accepts it. `/\host` is the same
 * thing with a backslash, which browsers normalise to `//host` when resolving —
 * `new URL("/\\evil.example", "https://site.example")` is `https://evil.example/`.
 *
 * Both are refused here. A form action is where a visitor's typed data is sent,
 * so a target that quietly leaves the origin is the most costly version of the
 * composition mistake this schema exists to catch, and the one least likely to
 * be noticed in review: it looks like a path.
 */
const isSameOriginPath = (value: string): boolean =>
  value.startsWith("/") && value[1] !== "/" && value[1] !== "\\"

/**
 * An action is either a same-origin path or an absolute `http(s)` URL.
 *
 * The host wrote it, so this is not the check `linkUrlSchema` makes about
 * AI-authored URLs — it is the check that a host's own composition mistake does
 * not become a live `javascript:` form action, that an empty string does not
 * silently mean "post to this page", and that a path-shaped action does not post
 * off the origin. A relative path with no leading `/` is refused for a related
 * reason: it resolves against whatever route the form happens to be rendered on,
 * which is not a decision anybody made.
 *
 * Leaving the origin is still allowed — but only by saying so, as a full
 * `https://` URL. The rule is that crossing an origin is explicit, not that it
 * is forbidden.
 */
const actionSchema = z.string().superRefine((value, context) => {
  if (isSameOriginPath(value)) return

  const parsed = ((): URL | undefined => {
    try {
      return new URL(value)
    } catch {
      return undefined
    }
  })()

  if (!parsed || !["http:", "https:"].includes(parsed.protocol)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "must be a same-origin path or an absolute http(s) URL",
    })
  }
})

export const submissionTargetSchema: z.ZodType<SubmissionTarget, z.ZodTypeDef, unknown> = z.object({
  action: actionSchema,
  method: z.enum(["get", "post"]),
  fields: z
    .array(z.object({ name: z.string().min(1), value: z.string() }))
    .readonly()
    .default([]),
})

/** What an endpoint says when it cannot give a target. */
export type SubmissionFailure = {
  /**
   * `unavailable` is "ask again later" — a token store that is down, a
   * dependency that timed out. `refused` is "not for you" — a form this
   * audience may not submit, an endpoint the deployment turned off. Separate
   * because a primitive shows different things for them, and because only one
   * of the two is worth trying again.
   */
  readonly code: "unavailable" | "refused"
  readonly detail: string
}

export type EndpointRequest = {
  /** The render request's opaque host context — audience, locale, tenant. */
  readonly context: JsonObject | undefined
}

export interface SubmissionEndpoint {
  readonly target: (request: EndpointRequest) => Promise<Result<SubmissionTarget, SubmissionFailure>>
}

/**
 * Why a node has no target. Each is something a primitive may be told about and
 * a diagnostic says out loud; none of them is an exception anyone catches.
 */
export type SubmissionUnavailable = {
  readonly reason:
    | "no-such-endpoint"
    | "invalid-target"
    | "endpoint-threw"
    | SubmissionFailure["code"]
  readonly detail: string
}

export const describeSubmissionUnavailable = (unavailable: SubmissionUnavailable): string => {
  switch (unavailable.reason) {
    case "no-such-endpoint":
      return `no endpoint is registered for it — ${unavailable.detail}`
    case "invalid-target":
      return `the endpoint answered with a target the seam refuses — ${unavailable.detail}`
    case "endpoint-threw":
      return `the endpoint threw instead of answering — ${unavailable.detail}`
    case "unavailable":
      return `the endpoint could not be reached — ${unavailable.detail}`
    case "refused":
      return `the endpoint refused — ${unavailable.detail}`
  }
}

export type EndpointDefinition = {
  readonly id: string
  /**
   * One line, for the catalogue. A model choosing where a form posts has this
   * and the id to go on, and nothing else — which is the point.
   */
  readonly description: string
  readonly endpoint: SubmissionEndpoint
}

/**
 * A definition with the host's own types erased, which is what a heterogeneous
 * registry can hold. `defineEndpoint` is the only way to build one, so the
 * validation of what the host answered happens in exactly one place.
 */
export type EndpointEntry = {
  readonly id: string
  readonly description: string
  /** Total: calls, catches, validates. Never rejects. */
  readonly resolve: (
    context: JsonObject | undefined
  ) => Promise<Result<SubmissionTarget, SubmissionUnavailable>>
}

const firstIssue = (error: {
  issues: readonly { path: readonly PropertyKey[]; message: string }[]
}): string => {
  const [issue] = error.issues
  if (!issue) return "refused, without saying why"

  const path = issue.path.length === 0 ? "" : `${issue.path.map(String).join(".")}: `

  return `${path}${issue.message}`
}

/**
 * Declares an endpoint. The target it answers with is validated even though the
 * host typed it, for the reason `defineSource` validates an answer: the type is
 * a claim made when the code was written, and the schema is what makes the
 * claim true on the day the route moved.
 */
export const defineEndpoint = (definition: EndpointDefinition): EndpointEntry => ({
  id: definition.id,
  description: definition.description,
  resolve: async (context) => {
    /**
     * The same single `try` the data seam makes, for the same reason: an
     * endpoint is not Loom's code, and a rejected promise from one host's token
     * store must not be why a whole page 500s.
     */
    let answered: Result<SubmissionTarget, SubmissionFailure>
    try {
      answered = await definition.endpoint.target({ context })
    } catch (thrown) {
      return err({
        reason: "endpoint-threw",
        detail: thrown instanceof Error ? thrown.message : String(thrown),
      })
    }

    if (!answered.ok) return err({ reason: answered.error.code, detail: answered.error.detail })

    const target = submissionTargetSchema.safeParse(answered.value)

    return target.success
      ? ok(target.data)
      : err({ reason: "invalid-target", detail: firstIssue(target.error) })
  },
})

export type RegisteredEndpoint = EndpointEntry & { readonly id: EndpointId }

export type EndpointRegistryError =
  | { readonly code: "invalid-endpoint-id"; readonly id: string }
  | { readonly code: "duplicate-endpoint-id"; readonly id: string }

export const describeEndpointRegistryError = (error: EndpointRegistryError): string =>
  error.code === "invalid-endpoint-id"
    ? `"${error.id}" is not a valid endpoint id — expected dot-namespaced kebab-case, like "contact.enquiry"`
    : `"${error.id}" is registered twice; a form naming it would post to whichever registration won`

export interface EndpointRegistry {
  readonly endpoint: (id: EndpointId) => RegisteredEndpoint | undefined
  /** In registration order, so a catalogue reads predictably. */
  readonly endpoints: readonly RegisteredEndpoint[]
}

/**
 * Building the registry is pure and calls no endpoint, so registering cannot
 * mint a token as a side effect of an import.
 */
export const createEndpointRegistry = (
  entries: readonly EndpointEntry[]
): Result<EndpointRegistry, EndpointRegistryError> => {
  const endpoints: RegisteredEndpoint[] = []
  const byId = new Map<string, RegisteredEndpoint>()

  for (const entry of entries) {
    const id = endpointIdSchema.safeParse(entry.id)
    if (!id.success) return err({ code: "invalid-endpoint-id", id: entry.id })
    if (byId.has(id.data)) return err({ code: "duplicate-endpoint-id", id: entry.id })

    const registered: RegisteredEndpoint = { ...entry, id: id.data }
    byId.set(id.data, registered)
    endpoints.push(registered)
  }

  return ok({
    endpoint: (id) => byId.get(id),
    endpoints: Object.freeze(endpoints),
  })
}
