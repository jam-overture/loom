import { z } from "zod"

import { jsonObjectSchema, type JsonObject } from "../json.js"
import { err, ok, type Result } from "../result.js"

import { bindingNameSchema, sourceIdSchema, type BindingName, type SourceId } from "./source.js"

/**
 * What a node asks the host to answer, as it appears in the tree.
 *
 * A binding is a *question*, never an answer: a registered source id and the
 * parameters to ask it with. Nothing about the reply is in the tree, which is
 * what keeps a tree a document rather than a cache — two deployments serving the
 * same revision show the same page structure asking the same questions, and
 * differ only where their data differs.
 *
 * ```json
 * "loom:data": {
 *   "services": { "source": "catalogue.services", "params": { "limit": 6 } },
 *   "bio":      { "source": "profile.field", "params": { "field": "bio" } }
 * }
 * ```
 *
 * Params are AI-authored like everything else in a tree, so a source declares
 * what it accepts and the registry checks it (0058). An adapter that takes a
 * free-form query string would be handing a model the keys to the host's data,
 * which is the failure 0053 rejected for URLs in the same words.
 */

export type Binding = {
  readonly source: SourceId
  readonly params: JsonObject
}

/** Bindings on one node, by the name the primitive reads them under. */
export type NodeBindings = ReadonlyMap<BindingName, Binding>

const bindingSchema = z.object({
  source: sourceIdSchema,
  params: jsonObjectSchema.optional(),
})

const bindingsSchema = z.record(bindingNameSchema, bindingSchema)

export type BindingError = {
  /** The path of the offending entry, for a diagnostic a person can act on. */
  readonly path: string
  readonly message: string
}

export const describeBindingError = (error: BindingError): string =>
  `${error.path}: ${error.message}`

/**
 * Parses the value of `loom:data`. Total, like every other parse of something
 * that came out of storage: a malformed binding map is reported and the node
 * renders without data, rather than throwing on a page nobody can then see.
 *
 * The whole map is refused together when any entry is bad. Answering half of a
 * malformed declaration would hand a primitive a bag that satisfies neither
 * what the author wrote nor what the schema says, and "some of your bindings
 * silently did not happen" is the hardest kind of failure to notice.
 */
export const parseBindings = (declared: unknown): Result<NodeBindings, BindingError> => {
  const parsed = bindingsSchema.safeParse(declared)

  if (!parsed.success) {
    const [issue] = parsed.error.issues

    return err({
      path: issue && issue.path.length > 0 ? issue.path.map(String).join(".") : "loom:data",
      message: issue?.message ?? "is not a map of binding names to sources",
    })
  }

  /**
   * Zod types a record with a branded key as partial, so the values are
   * `T | undefined` even though every key it produced came with one. Filtering
   * rather than asserting keeps the one place that could be wrong honest.
   */
  return ok(
    new Map(
      Object.entries(parsed.data).flatMap(([name, binding]) =>
        binding
          ? [[name as BindingName, { source: binding.source, params: binding.params ?? {} }] as const]
          : []
      )
    )
  )
}
