import type { PrimitiveType, SlotName } from "./primitive-type.js"

/**
 * What a deployment can build with, as data.
 *
 * A registry knows which primitives exist, what props each declares, and which
 * slots each projects. Several things need that knowledge and none of them
 * should reach into a registry's internals for it: the interpreter has to tell a
 * model what it may create, a portal has to offer an insert menu, and telemetry
 * has to record what was available when a proposal was made.
 *
 * So the catalogue is a projection — the same relationship the model-facing
 * reply schema has to the AST (0004). It is deliberately shallower than the Zod
 * schemas it comes from: prop names and whether each is required, not their
 * types. A structural description of arbitrary Zod is a second schema language
 * to maintain, and the model already sees concrete prop values in the tree
 * outline, so the marginal value is small next to the cost of keeping it honest.
 */

export type CataloguedProp = {
  readonly name: string
  readonly required: boolean
}

export type CataloguedPrimitive = {
  readonly type: PrimitiveType
  /** One line, written by the primitive's author, about what it is for. */
  readonly description: string
  /**
   * Declared props, name-sorted. `undefined` when the declared schema is not an
   * object schema and its keys therefore cannot be enumerated — unknown, which
   * is not the same claim as "none".
   */
  readonly props: readonly CataloguedProp[] | undefined
  readonly slots: readonly SlotName[]
}

export type PrimitiveCatalogue = readonly CataloguedPrimitive[]
