import { ZodEffects, ZodObject, type ZodRawShape, type ZodTypeAny } from "zod"

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

/**
 * Field names for the catalogue, when the declared schema is an object schema
 * and its keys can therefore be enumerated. Anything else — a union of shapes, a
 * refined record — answers `undefined` rather than an empty list, because "I
 * cannot tell you" and "there are none" are different facts and a model reading
 * the catalogue would act on them differently.
 *
 * It lives here rather than beside either of its two callers because both
 * `definePrimitive` and `defineSource` project a Zod schema into this shape, and
 * the second one arriving is what turned a private helper into the catalogue's
 * own job. Only public Zod surface is used: `instanceof`, `.shape`,
 * `.innerType()`, and `.isOptional()`.
 */

/**
 * The object schema inside whatever wraps it, or nothing when there is none.
 *
 * A cross-field rule — "alt text is required unless the image is decorative" —
 * is a `.refine()`, and refining an object schema returns a `ZodEffects` around
 * it rather than another `ZodObject`. Stopping at the wrapper would answer
 * "I cannot enumerate these" for exactly the schemas that most need explaining
 * to a model, so the wrapper is unwrapped and the constraint lives where it
 * always did: in validation, not in the catalogue.
 */
const objectSchemaWithin = (schema: ZodTypeAny): ZodObject<ZodRawShape> | undefined => {
  if (schema instanceof ZodObject) return schema
  if (schema instanceof ZodEffects) return objectSchemaWithin(schema.innerType() as ZodTypeAny)

  return undefined
}

export const catalogueFields = (schema: ZodTypeAny): readonly CataloguedProp[] | undefined => {
  const object = objectSchemaWithin(schema)
  if (!object) return undefined

  const shape: Readonly<Record<string, ZodTypeAny>> = object.shape

  return Object.keys(shape)
    .sort()
    .flatMap((name) => {
      const member = shape[name]

      return member ? [{ name, required: !member.isOptional() }] : []
    })
}
