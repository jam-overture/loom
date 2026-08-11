import {
  ZodEffects,
  ZodObject,
  type ZodRawShape,
  type ZodType,
  type ZodTypeAny,
  type ZodTypeDef,
} from "zod"

import type { CataloguedProp } from "../catalogue.js"
import type { JsonObject, JsonObjectView } from "../json.js"
import type { LoomPrimitive } from "../render/primitive.js"
import type { PropsIssue, PropsVerdict } from "../render/props.js"

/**
 * The registration contract: what an author declares to make a component
 * something a Loom tree may name.
 *
 * Four things, and each one exists because something downstream cannot work
 * without it:
 *
 * - `type` — the identifier a tree addresses it by. Validated at registration,
 *   not here, because a raw string is what an author writes and the registry is
 *   the boundary.
 * - `description` — one line, for the catalogue. A model choosing between
 *   `loom.card` and `loom.panel` has nothing else to go on.
 * - `props` — the schema the render seam enforces (0009). Required, with no
 *   "unvalidated" option: props in a tree are AI-authored, and a primitive that
 *   declines to say what it accepts is asking the deployment to trust a model's
 *   guess about its own internals.
 * - `slots` — the named regions it projects into, so a proposal can be told
 *   where children may go rather than discovering it by being refused.
 */

export type PrimitiveDefinition<TProps extends JsonObjectView = JsonObject> = {
  readonly type: string
  readonly description: string
  readonly props: ZodType<TProps, ZodTypeDef, unknown>
  readonly slots?: readonly string[]
  readonly component: LoomPrimitive<TProps>
}

/**
 * A definition with its prop type erased, which is what a heterogeneous
 * registry can hold. `definePrimitive` is the only way to build one, so the
 * erasure happens exactly once, in the one place that still has both the schema
 * and the component type in hand and can prove they agree.
 */
export type PrimitiveEntry = {
  readonly type: string
  readonly description: string
  readonly slots: readonly string[]
  readonly component: LoomPrimitive
  readonly declaredProps: readonly CataloguedProp[] | undefined
  readonly validate: (props: JsonObject) => PropsVerdict
}

const toIssue = (issue: { path: readonly (string | number | symbol)[]; message: string }): PropsIssue => ({
  path: issue.path.length === 0 ? "props" : issue.path.map(String).join("."),
  message: issue.message,
})

const verdictFor = <TProps extends JsonObjectView>(
  schema: ZodType<TProps, ZodTypeDef, unknown>,
  props: JsonObject
): PropsVerdict => {
  const parsed = schema.safeParse(props)

  /**
   * The parse output is discarded on purpose — see `render/props.ts`. What the
   * primitive receives is the tree's props, so the page is a function of the
   * tree alone and not of which schema version this deployment happens to run.
   */
  return parsed.success
    ? { outcome: "valid" }
    : { outcome: "invalid", issues: parsed.error.issues.map(toIssue) }
}

/**
 * Prop names for the catalogue, when the declared schema is an object schema and
 * its keys can therefore be enumerated. Anything else — a union of shapes, a
 * refined record — answers `undefined` rather than an empty list, because "I
 * cannot tell you" and "there are none" are different facts and a model reading
 * the catalogue would act on them differently.
 *
 * Only public Zod surface is used: `instanceof`, `.shape`, `.innerType()`, and
 * `.isOptional()`.
 */

/**
 * The object schema inside whatever wraps it, or nothing when there is none.
 *
 * A cross-field rule — "alt text is required unless the image is decorative" —
 * is a `.refine()`, and refining an object schema returns a `ZodEffects` around
 * it rather than another `ZodObject`. Stopping at the wrapper would answer
 * "I cannot enumerate these props" for exactly the primitives whose props most
 * need explaining to a model, so the wrapper is unwrapped and the constraint
 * lives where it always did: in validation, not in the catalogue.
 */
const objectSchemaWithin = (schema: ZodTypeAny): ZodObject<ZodRawShape> | undefined => {
  if (schema instanceof ZodObject) return schema
  if (schema instanceof ZodEffects) return objectSchemaWithin(schema.innerType() as ZodTypeAny)

  return undefined
}
const declaredPropsOf = <TProps extends JsonObjectView>(
  schema: ZodType<TProps, ZodTypeDef, unknown>
): readonly CataloguedProp[] | undefined => {
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
 * Declares a primitive. The generic parameter is inferred from the schema, so
 * the component is checked against what its own schema produces at the point of
 * declaration rather than at the point of registration — an author who reads
 * `props.titel` finds out here.
 */
export const definePrimitive = <TProps extends JsonObjectView>(
  definition: PrimitiveDefinition<TProps>
): PrimitiveEntry => ({
  type: definition.type,
  description: definition.description,
  slots: definition.slots ?? [],
  /**
   * The one narrowing cast in the SDK, and the invariant that makes it sound:
   * a registry hands the renderer this component and the validator built from
   * the same definition's schema, and the renderer only renders a node whose
   * props that validator accepted. Widening the props type here without the
   * validator beside it would be unsound, which is why the registry is what
   * exposes both and why neither is exported alone.
   */
  component: definition.component as LoomPrimitive,
  declaredProps: declaredPropsOf(definition.props),
  validate: (props) => verdictFor(definition.props, props),
})
