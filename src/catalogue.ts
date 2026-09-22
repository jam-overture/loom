import {
  ZodBoolean,
  ZodDefault,
  ZodEffects,
  ZodEnum,
  ZodNullable,
  ZodObject,
  ZodOptional,
  type ZodRawShape,
  type ZodTypeAny,
} from "zod"

import type { BindingName } from "./data/source.js"
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
  /**
   * The binding names this primitive reads an answer under, name-sorted.
   * `undefined` when its author has not said — which, like `props`, is not the
   * same claim as "none" and is not rounded to one.
   *
   * It is the one field here that is about what the primitive *asks the
   * deployment for* rather than about what a tree may write on it, and it is
   * here because the name in a binding belongs to the primitive. A model is
   * told which sources exist by the data catalogue; without this it was never
   * told which names those answers may be filed under, so the only name it
   * could write was one it had seen on the page already.
   */
  readonly reads: readonly BindingName[] | undefined
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

/**
 * A prop whose accepted values can be listed rather than invented.
 *
 * The values are `string | boolean` and never a number, because those are the
 * two shapes a schema closes over by construction: an enum names its members
 * and a boolean has exactly two. `z.number()` has no enumerable set, and
 * choosing one would make anything read off it a function of the guess.
 */
export type ClosedChoice = {
  readonly name: string
  readonly options: readonly (string | boolean)[]
}

/**
 * The closed choices a declared schema names, by prop, name-sorted.
 *
 * This is not the catalogue and is deliberately not part of it — a model reads
 * concrete prop values in the tree outline, which is the reason the catalogue
 * stops at names. It lives here anyway because it reads the same object schema
 * through the same public Zod surface, and the alternative is a second copy of
 * `objectSchemaWithin` in another file.
 *
 * What wants it is the conformance probe (0075): a primitive whose children
 * depend on a prop cannot be classified from one render, and these are the
 * props whose values the probe can vary without making anything up.
 */
const choicesWithin = (schema: ZodTypeAny): readonly (string | boolean)[] | undefined => {
  if (schema instanceof ZodEnum) return (schema as ZodEnum<[string, ...string[]]>).options
  if (schema instanceof ZodBoolean) return [false, true]

  /**
   * Wrappers, not shapes. `.optional()` and `.default()` change whether a prop
   * must be present, not which values it accepts, so a `type` that is an
   * optional enum closes over exactly the enum's members.
   */
  if (schema instanceof ZodOptional) return choicesWithin(schema.unwrap() as ZodTypeAny)
  if (schema instanceof ZodNullable) return choicesWithin(schema.unwrap() as ZodTypeAny)
  if (schema instanceof ZodDefault) return choicesWithin(schema.removeDefault() as ZodTypeAny)

  return undefined
}

export const closedChoices = (schema: ZodTypeAny): readonly ClosedChoice[] => {
  const object = objectSchemaWithin(schema)
  if (!object) return []

  const shape: Readonly<Record<string, ZodTypeAny>> = object.shape

  return Object.keys(shape)
    .sort()
    .flatMap((name) => {
      const member = shape[name]
      const options = member ? choicesWithin(member) : undefined

      return options ? [{ name, options }] : []
    })
}
