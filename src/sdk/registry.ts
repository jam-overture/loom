import type { InteractiveWhen } from "../interactivity.js"
import type { JsonObject } from "../json.js"
import {
  primitiveTypeSchema,
  slotNameSchema,
  textKeySchema,
  type PrimitiveType,
  type SlotName,
} from "../primitive-type.js"
import { err, ok, type Result } from "../result.js"
import type { LoomPrimitive, PrimitiveResolver } from "../render/primitive.js"
import type { PropsValidator, PropsVerdict } from "../render/props.js"
import { NO_TEXT, type PrimitiveText, type TextResolver } from "../render/text.js"

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
 * It also satisfies `TextResolver`, over the declared strings themselves. A
 * deployment that translates nothing is then correct with no extra wiring, and
 * translating is `textResolverFor` wrapping this same registry with a
 * dictionary — the untranslated case is the base case, not a fallback path that
 * only runs when something is missing.
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
  /** The props the conformance probe can vary, from the declared schema (0075). */
  readonly choices: PrimitiveEntry["choices"]
  /** Declared strings in the author's language, before any dictionary. */
  readonly text: PrimitiveText<string>
  /** Whether it renders a target, and what makes it one. Absent for most. */
  readonly interactive: InteractiveWhen | undefined
  /** Whether its author says it posts (0065). `false` for most. */
  readonly submits: boolean
  readonly validate: (props: JsonObject) => PropsVerdict
}

export type RegistryError =
  | { readonly code: "invalid-primitive-type"; readonly type: string }
  | { readonly code: "invalid-slot-name"; readonly type: string; readonly slot: string }
  | { readonly code: "invalid-text-key"; readonly type: string; readonly key: string }
  | { readonly code: "blank-text"; readonly type: string; readonly key: string }
  | { readonly code: "undeclared-interactive-prop"; readonly type: string; readonly prop: string }
  | { readonly code: "duplicate-primitive-type"; readonly type: string }

export type PrimitiveRegistry = PrimitiveResolver &
  PropsValidator &
  TextResolver & {
    /** In registration order, so a catalogue and an audit read predictably. */
    readonly primitives: readonly RegisteredPrimitive[]
  }

export const describeRegistryError = (error: RegistryError): string => {
  switch (error.code) {
    case "invalid-primitive-type":
      return `"${error.type}" is not a valid primitive type — expected dot-namespaced kebab-case, like "commerce.product-card"`
    case "invalid-slot-name":
      return `"${error.slot}" is not a valid slot name on "${error.type}" — expected camelCase, like "mainContent"`
    case "invalid-text-key":
      return `"${error.key}" is not a valid text key on "${error.type}" — expected camelCase with no dots, like "notIncluded"`
    case "blank-text":
      return `"${error.key}" on "${error.type}" declares an empty string; a string worth translating has something in it, and a blank one renders as a control with no name`
    case "undeclared-interactive-prop":
      return `"${error.type}" says it renders a target when "${error.prop}" is set, and its schema declares no such prop; a trigger naming a prop that cannot arrive is a target the Gate will never see`
    case "duplicate-primitive-type":
      return `"${error.type}" is registered twice; a tree naming it would resolve to whichever registration won`
  }
}

/**
 * A trigger prop that the schema does not declare, if there is one.
 *
 * The one thing about an interactivity declaration that can be checked without
 * calling the component, and the drift that actually happens: a prop is renamed
 * and the declaration keeps naming the old one, which is silent — the primitive
 * still renders its anchor and the Gate stops believing it ever does.
 *
 * A schema whose fields cannot be enumerated answers `undefined` rather than an
 * empty list, and is left alone. "I cannot tell you" is not "there are none",
 * and refusing a registration on the strength of it would be refusing on a
 * guess.
 */
const undeclaredTriggerProp = (entry: PrimitiveEntry): string | undefined => {
  const { interactive, declaredProps } = entry
  if (!interactive || interactive === "always" || !declaredProps) return undefined

  const declared = new Set(declaredProps.map((prop) => prop.name))

  return interactive.whenProps.find((prop) => !declared.has(prop))
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

  for (const [key, value] of Object.entries(entry.text)) {
    if (!textKeySchema.safeParse(key).success) {
      return err({ code: "invalid-text-key", type: entry.type, key })
    }

    if (value.trim() === "") return err({ code: "blank-text", type: entry.type, key })
  }

  const undeclared = undeclaredTriggerProp(entry)
  if (undeclared !== undefined) {
    return err({ code: "undeclared-interactive-prop", type: entry.type, prop: undeclared })
  }

  return ok({
    type: type.data,
    description: entry.description,
    slots,
    component: entry.component,
    declaredProps: entry.declaredProps,
    choices: entry.choices,
    text: entry.text,
    interactive: entry.interactive,
    submits: entry.submits,
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
    textFor: (type: PrimitiveType): PrimitiveText<string> => byType.get(type)?.text ?? NO_TEXT,
  })
}
