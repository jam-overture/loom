import type { PrimitiveCatalogue } from "../catalogue.js"

import type { PrimitiveRegistry } from "./registry.js"

/**
 * The one function that turns a registry into something that can leave the
 * process.
 *
 * Everything a model, a telemetry record or another service is told about a
 * deployment's primitives comes through here.
 */

/**
 * The shape of what `catalogueOf` hands back, carried by the same entry point.
 *
 * Without this a host writing a function over the answer imports the function
 * from `@loom/runtime/sdk` and the type of its result from `@loom/runtime`. Both
 * are public doors and nothing was blocked, but it is a paper cut met in the
 * first hour — found writing a page that prints one catalogue entry.
 *
 * Three names rather than `export type *`, which is what was asked for and is
 * not what this should be: the reference generator resolves a star re-export by
 * walking the target module, and does not honour the `type` modifier. Starring
 * put `catalogueFields` and `closedChoices` on the published page as functions
 * this door offers, and the door does not offer them — they are values, so
 * `export type *` never carried them and `sdk.catalogueFields` is `undefined`.
 * Naming the three types the catalogue is made of says the true thing in a way
 * the generator reads correctly.
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
    reads: primitive.reads,
  }))
