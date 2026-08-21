import type { InteractiveTypes, InteractiveWhen } from "../interactivity.js"

import type { PrimitiveRegistry } from "./registry.js"

/**
 * How a library tells the gate which of its primitives a reader aims at.
 *
 * The declaration is made once, on the primitive, and read here into the
 * vocabulary a policy uses to refuse a change that would nest one target inside
 * another.
 */

/**
 * A registry's interactivity declarations, in the shape a Gate policy takes.
 *
 * This is the whole reason the declaration lives on the primitive rather than
 * in a policy file. A host that hand-wrote `{ "loom.card": { whenProps:
 * ["href"] } }` would be maintaining, in a second place, a fact that is only
 * knowable in the first — and the day someone gives `loom.feature` an `href`,
 * the hand-written copy is wrong and nothing says so. Here the library grows
 * and the policy grows with it.
 *
 * `textCatalogue` is the same move for the same reason: derive what a
 * deployment must configure from what its primitives already declare, so the
 * configuration cannot describe a library that is not the one installed.
 *
 * Deriving it is still the host's explicit call, not something a registry
 * imposes. A deployment that wants the check off leaves this out of its policy,
 * and a deployment with a second registry composes two of these.
 */
export const interactiveTypesFor = (registry: PrimitiveRegistry): InteractiveTypes => {
  const types: Record<string, InteractiveWhen> = {}

  for (const primitive of registry.primitives) {
    if (primitive.interactive) types[primitive.type] = primitive.interactive
  }

  return types
}
