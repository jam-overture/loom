import type { PrimitiveCatalogue } from "../catalogue.js"

import type { PrimitiveRegistry } from "./registry.js"

/**
 * The registry, projected into the catalogue other components read.
 *
 * A projection rather than the registry itself, because the registry holds
 * components and closures — things that cannot be serialised, sent to a model,
 * or recorded in telemetry. What survives the projection is exactly what a
 * consumer outside this process can act on.
 */
export const catalogueOf = (registry: PrimitiveRegistry): PrimitiveCatalogue =>
  registry.primitives.map((primitive) => ({
    type: primitive.type,
    description: primitive.description,
    props: primitive.declaredProps,
    slots: primitive.slots,
  }))
