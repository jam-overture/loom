import { err, ok, type Result } from "../result.js"

import type { PrimitiveEntry } from "./definition.js"

/**
 * Taking part of a primitive library rather than all of it.
 *
 * A library is a set to choose from. Loom's own starter set is one, and a host
 * building a registry from it has always been able to *add* — the starter
 * factory takes the entries a deployment defines itself and appends them — but
 * never to take fewer. A deployment that wants sixty of the ninety-six had one
 * move available, which was to filter the exported array on its type strings.
 *
 * That works and it fails quietly. A filter against a name nothing carries —
 * a typo, or a primitive renamed since the list was written — yields a smaller
 * registry and says nothing, so the deployment loses a primitive and finds out
 * when a page fails to draw. Choosing is the operation; a choice naming
 * something that is not there is a mistake, and this is where it is caught.
 */

/**
 * Every name the library does not carry, not just the first.
 *
 * Registration errors are reported one at a time because each is a defect in a
 * definition, and fixing one is the only way to see the next. A selection is
 * different in kind: it is a list a person wrote in one sitting, and all of its
 * mistakes are mistakes now. Naming them together is the difference between one
 * correction and four rounds of it.
 */
export type SelectionError = {
  readonly code: "unregistered-types"
  readonly types: readonly string[]
}

export const describeSelectionError = (error: SelectionError): string =>
  `${error.types.map((type) => `"${type}"`).join(", ")} ${error.types.length === 1 ? "is not a primitive in this library" : "are not primitives in this library"}; a selection names what to keep, so a name nothing carries is a choice that cannot be honoured rather than a smaller registry`

/**
 * The entries a deployment chose, in the library's own order.
 *
 * The library's order rather than the caller's, because the order entries are
 * registered in is the order a catalogue lists them in and the order an audit
 * reads them in: a slice of a library is still that library, shorter. A host
 * that wants a different order has the array and can build one.
 *
 * A name given twice selects one entry, because the result is a subset and a
 * subset has no repeats. That matters beyond tidiness — a registry refuses a
 * duplicate type, so a selection that passed one through would turn a harmless
 * repetition in a list into a refusal two calls later.
 */
export const selectPrimitives = (
  entries: readonly PrimitiveEntry[],
  types: readonly string[]
): Result<readonly PrimitiveEntry[], SelectionError> => {
  const available = new Set(entries.map((entry) => entry.type))
  const missing = [...new Set(types)].filter((type) => !available.has(type))

  if (missing.length > 0) return err<SelectionError>({ code: "unregistered-types", types: missing })

  const chosen = new Set(types)

  return ok(entries.filter((entry) => chosen.has(entry.type)))
}
