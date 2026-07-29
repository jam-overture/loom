import type { JsonObject } from "../json.js"
import { primitiveTypeSchema, slotNameSchema, type PrimitiveType, type SlotName } from "../primitive-type.js"
import { err, ok, type Result } from "../result.js"
import type { LoomPrimitive, PrimitiveResolver } from "../render/primitive.js"
import type { PropsValidator, PropsVerdict } from "../render/props.js"

import type { PrimitiveEntry } from "./definition.js"

/**
 * The registry: the set of primitives a deployment can render, and the seam the
 * renderer resolves against.
 *
 * It satisfies both renderer-facing interfaces — `PrimitiveResolver` and
 * `PropsValidator` — because the two are only sound together. A component
 * declares a narrower prop type than the tree can express, and what makes that
 * claim true is that the same object which resolved the component also vetted
 * the props. Wiring one without the other is possible (the interfaces are
 * separate on purpose) but it is then a host's explicit decision, not an
 * accident of construction.
 *
 * Construction is pure and does not touch the components. Nothing here calls a
 * primitive, so registering cannot run someone's render as a side effect of an
 * import; the checks that need to call one live in `audit.ts`, which a host runs
 * in a test or a build step.
 */

export type RegisteredPrimitive = {
  readonly type: PrimitiveType
  readonly description: string
  readonly slots: readonly SlotName[]
  readonly component: LoomPrimitive
  readonly declaredProps: PrimitiveEntry["declaredProps"]
  readonly validate: (props: JsonObject) => PropsVerdict
}

export type RegistryError =
  | { readonly code: "invalid-primitive-type"; readonly type: string }
  | { readonly code: "invalid-slot-name"; readonly type: string; readonly slot: string }
  | { readonly code: "duplicate-primitive-type"; readonly type: string }

export type PrimitiveRegistry = PrimitiveResolver &
  PropsValidator & {
    /** In registration order, so a catalogue and an audit read predictably. */
    readonly primitives: readonly RegisteredPrimitive[]
  }

export const describeRegistryError = (error: RegistryError): string => {
  switch (error.code) {
    case "invalid-primitive-type":
      return `"${error.type}" is not a valid primitive type — expected dot-namespaced kebab-case, like "commerce.product-card"`
    case "invalid-slot-name":
      return `"${error.slot}" is not a valid slot name on "${error.type}" — expected camelCase, like "mainContent"`
    case "duplicate-primitive-type":
      return `"${error.type}" is registered twice; a tree naming it would resolve to whichever registration won`
  }
}

const registerEntry = (entry: PrimitiveEntry): Result<RegisteredPrimitive, RegistryError> => {
  const type = primitiveTypeSchema.safeParse(entry.type)
  if (!type.success) return err({ code: "invalid-primitive-type", type: entry.type })

  const slots: SlotName[] = []

  for (const slot of entry.slots) {
    const parsed = slotNameSchema.safeParse(slot)
    if (!parsed.success) return err({ code: "invalid-slot-name", type: entry.type, slot })

    slots.push(parsed.data)
  }

  return ok({
    type: type.data,
    description: entry.description,
    slots,
    component: entry.component,
    declaredProps: entry.declaredProps,
    validate: entry.validate,
  })
}

/**
 * Builds a registry, or refuses. A duplicate type is refused rather than
 * resolved last-wins: two registrations for one identifier means a tree's
 * meaning depends on module evaluation order, which is not a thing anyone should
 * have to debug from a rendered page.
 *
 * Lookup is a `Map`, so a primitive named `constructor` or `toString` is an
 * ordinary key rather than a reach into `Object.prototype`.
 */
export const createPrimitiveRegistry = (
  entries: readonly PrimitiveEntry[]
): Result<PrimitiveRegistry, RegistryError> => {
  const byType = new Map<string, RegisteredPrimitive>()
  const primitives: RegisteredPrimitive[] = []

  for (const entry of entries) {
    const registered = registerEntry(entry)
    if (!registered.ok) return registered

    if (byType.has(registered.value.type)) {
      return err({ code: "duplicate-primitive-type", type: registered.value.type })
    }

    byType.set(registered.value.type, registered.value)
    primitives.push(registered.value)
  }

  return ok({
    primitives,
    resolve: (type: PrimitiveType) => byType.get(type)?.component,
    validateProps: (type: PrimitiveType, props: JsonObject): PropsVerdict =>
      byType.get(type)?.validate(props) ?? { outcome: "undeclared" },
  })
}
