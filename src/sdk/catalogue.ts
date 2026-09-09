import type { PrimitiveCatalogue } from "../catalogue.js"

import type { PrimitiveRegistry } from "./registry.js"

/**
 * The one function that turns a registry into something that can leave the
 * process.
 *
 * Everything a model, a telemetry record or another service is told about a
 * deployment's primitives comes through here.
 *
 * The shape of the answer comes through here too, and until now it did not: a
 * host writing a function over what `catalogueOf` hands back imported the
 * function from `@loom/runtime/sdk` and the shape of its answer from
 * `@loom/runtime`. `Loom marketing` met that in the first hour of writing a page
 * that prints one catalogue entry. The three types are re-exported by name
 * rather than wholesale, because `catalogueFields` and `closedChoices` read a
 * Zod schema and belong to the root entry point where a registry is built —
 * `export type *` would put them on this door too, as names with signatures and
 * no values behind them.
 */

export type { CataloguedPrimitive, CataloguedProp, PrimitiveCatalogue } from "../catalogue.js"

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
