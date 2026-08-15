import type { ZodType, ZodTypeAny, ZodTypeDef } from "zod"

import { catalogueFields, type CataloguedProp } from "../catalogue.js"
import type { JsonObject, JsonValue } from "../json.js"
import { err, ok, type Result } from "../result.js"

import { sourceIdSchema, type SourceId } from "./source.js"

/**
 * The host's half of the data seam: what answers a binding.
 *
 * An adapter is the only place in a render that does IO, and it is foreign code
 * — a query against someone's database, a call to an integration that is having
 * a bad afternoon. Everything here exists to keep that from reaching the page:
 * the params it is handed are validated first, the answer it gives back is
 * validated after, and a throw is caught and reported like any other refusal.
 *
 * The registration shape deliberately mirrors `definePrimitive`. A source
 * declares an id, one line about itself, what it accepts and what it answers;
 * the registry erases the types and is the only thing that hands out either
 * half, for the same soundness reason the primitive registry gives.
 */

export type SourceRequest<TParams> = {
  readonly params: TParams
  /** The render request's opaque host context — audience, locale, tenant. */
  readonly context: JsonObject | undefined
}

/** What an adapter says when it cannot answer. */
export type SourceFailure = {
  /**
   * `unavailable` is "ask again later" — a timeout, a dead connection.
   * `refused` is "not for you" — an integration nobody connected, a record this
   * audience may not see. They are separate because a primitive shows different
   * things for them, and because only one of the two is worth retrying.
   */
  readonly code: "unavailable" | "refused"
  readonly detail: string
}

export interface DataAdapter<TParams = JsonObject, TAnswer extends JsonValue = JsonValue> {
  readonly fetch: (request: SourceRequest<TParams>) => Promise<Result<TAnswer, SourceFailure>>
}

/**
 * Why a binding has no value. Every one of these is something a primitive may
 * be told about and a diagnostic says out loud; none of them is an exception
 * anyone catches.
 */
export type DataUnavailable = {
  readonly reason:
    | "no-such-source"
    | "invalid-params"
    | "invalid-answer"
    | "adapter-threw"
    | SourceFailure["code"]
  readonly detail: string
}

export const describeDataUnavailable = (unavailable: DataUnavailable): string => {
  switch (unavailable.reason) {
    case "no-such-source":
      return `no source is registered for it — ${unavailable.detail}`
    case "invalid-params":
      return `the params in the tree are not what the source accepts — ${unavailable.detail}`
    case "invalid-answer":
      return `the source answered with something its own schema refuses — ${unavailable.detail}`
    case "adapter-threw":
      return `the source threw instead of answering — ${unavailable.detail}`
    case "unavailable":
      return `the source could not be reached — ${unavailable.detail}`
    case "refused":
      return `the source refused — ${unavailable.detail}`
  }
}

export type SourceDefinition<TParams, TAnswer extends JsonValue> = {
  readonly id: string
  /** One line, for the catalogue. A model choosing a source has this to go on. */
  readonly description: string
  /**
   * What the tree may ask with. Required, with no "anything" option: params are
   * AI-authored, and a source that declines to say what it accepts is asking the
   * deployment to trust a model's guess about its own query.
   */
  readonly params: ZodType<TParams, ZodTypeDef, unknown>
  /**
   * What it promises to answer with. Checked at the seam even though the adapter
   * is typed by it, because the adapter's type is a claim about a database and
   * the schema is the only thing that makes it true on the day the column
   * changed.
   */
  readonly answers: ZodType<TAnswer, ZodTypeDef, unknown>
  readonly adapter: DataAdapter<TParams, TAnswer>
}

/**
 * A definition with its types erased, which is what a heterogeneous registry can
 * hold. `defineSource` is the only way to build one, so the erasure happens once,
 * where both schemas and the adapter are still in hand and can be proved to agree.
 */
export type SourceEntry = {
  readonly id: string
  readonly description: string
  readonly declaredParams: readonly CataloguedProp[] | undefined
  /** Total: validates, calls, catches, validates again. Never rejects. */
  readonly answer: (
    params: JsonObject,
    context: JsonObject | undefined
  ) => Promise<Result<JsonValue, DataUnavailable>>
}

const firstIssue = (error: { issues: readonly { path: readonly PropertyKey[]; message: string }[] }): string => {
  const [issue] = error.issues
  if (!issue) return "refused, without saying why"

  const path = issue.path.length === 0 ? "" : `${issue.path.map(String).join(".")}: `

  return `${path}${issue.message}`
}

/**
 * Declares a source. The generic parameters are inferred from the schemas, so
 * the adapter is checked against what its own declaration produces at the point
 * of declaration rather than at the point of registration.
 */
export const defineSource = <TParams, TAnswer extends JsonValue>(
  definition: SourceDefinition<TParams, TAnswer>
): SourceEntry => ({
  id: definition.id,
  description: definition.description,
  declaredParams: catalogueFields(definition.params as ZodTypeAny),
  answer: async (params, context) => {
    const accepted = definition.params.safeParse(params)
    if (!accepted.success) {
      return err({ reason: "invalid-params", detail: firstIssue(accepted.error) })
    }

    /**
     * The one `try` in the runtime's own code. Loom does not throw across a
     * seam, but an adapter is not Loom's code, and a rejected promise from one
     * host's integration must not be the reason a whole page 500s.
     */
    let fetched: Result<TAnswer, SourceFailure>
    try {
      fetched = await definition.adapter.fetch({ params: accepted.data, context })
    } catch (thrown) {
      return err({
        reason: "adapter-threw",
        detail: thrown instanceof Error ? thrown.message : String(thrown),
      })
    }

    if (!fetched.ok) return err({ reason: fetched.error.code, detail: fetched.error.detail })

    const answered = definition.answers.safeParse(fetched.value)

    return answered.success
      ? ok(answered.data)
      : err({ reason: "invalid-answer", detail: firstIssue(answered.error) })
  },
})

export type RegisteredSource = SourceEntry & { readonly id: SourceId }

export type DataRegistryError =
  | { readonly code: "invalid-source-id"; readonly id: string }
  | { readonly code: "duplicate-source-id"; readonly id: string }

export const describeDataRegistryError = (error: DataRegistryError): string =>
  error.code === "invalid-source-id"
    ? `"${error.id}" is not a valid source id — expected dot-namespaced kebab-case, like "commerce.products"`
    : `"${error.id}" is registered twice; a binding naming it would reach whichever registration won`

export interface DataRegistry {
  readonly source: (id: SourceId) => RegisteredSource | undefined
  /** In registration order, so a catalogue reads predictably. */
  readonly sources: readonly RegisteredSource[]
}

/**
 * Building the registry is pure and calls no adapter, so registering cannot run
 * someone's query as a side effect of an import.
 */
export const createDataRegistry = (
  entries: readonly SourceEntry[]
): Result<DataRegistry, DataRegistryError> => {
  const sources: RegisteredSource[] = []
  const byId = new Map<string, RegisteredSource>()

  for (const entry of entries) {
    const id = sourceIdSchema.safeParse(entry.id)
    if (!id.success) return err({ code: "invalid-source-id", id: entry.id })
    if (byId.has(id.data)) return err({ code: "duplicate-source-id", id: entry.id })

    const registered: RegisteredSource = { ...entry, id: id.data }
    byId.set(id.data, registered)
    sources.push(registered)
  }

  return ok({
    source: (id) => byId.get(id),
    sources: Object.freeze(sources),
  })
}
