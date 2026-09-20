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
import {
  BEHAVIOURS,
  isBehaviourName,
  type BehaviourName,
  type BehaviourResolver,
} from "../render/behaviour.js"
import type { FrameResolver } from "../render/frame.js"
import type { LoomPrimitive, PrimitiveResolver } from "../render/primitive.js"
import type { PropsValidator, PropsVerdict } from "../render/props.js"
import { NO_TEXT, type PrimitiveText, type TextResolver } from "../render/text.js"
import { isPrimitiveRole, PRIMITIVE_ROLES, type PrimitiveRole } from "../role.js"

import type { CopyDeclarations } from "./copy.js"
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
  /** The props it puts in a frame (0095). Empty for all but one primitive. */
  readonly frames: readonly string[]
  /** The controls it takes from the runtime's vocabulary. Empty for most. */
  readonly behaviours: readonly BehaviourName[]
  /** What part it plays (0114). `undefined` for most, which play none. */
  readonly role: PrimitiveRole | undefined
  /**
   * The props a reader reads as words (0122). `undefined` where the primitive
   * has not said, which is not the same answer as `[]` and is not rounded to
   * it.
   */
  readonly copy: readonly string[] | undefined
  readonly validate: (props: JsonObject) => PropsVerdict
}

const NO_BEHAVIOUR_NAMES: readonly BehaviourName[] = Object.freeze([])

const NO_FRAME_PROPS: readonly string[] = Object.freeze([])

const NO_TYPES: readonly PrimitiveType[] = Object.freeze([])

export type RegistryError =
  | { readonly code: "invalid-primitive-type"; readonly type: string }
  | { readonly code: "invalid-slot-name"; readonly type: string; readonly slot: string }
  | { readonly code: "invalid-text-key"; readonly type: string; readonly key: string }
  | { readonly code: "blank-text"; readonly type: string; readonly key: string }
  | { readonly code: "undeclared-interactive-prop"; readonly type: string; readonly prop: string }
  | { readonly code: "undeclared-frame-prop"; readonly type: string; readonly prop: string }
  | { readonly code: "undeclared-copy-prop"; readonly type: string; readonly prop: string }
  | { readonly code: "unknown-behaviour"; readonly type: string; readonly behaviour: string }
  | {
      readonly code: "unnamed-behaviour"
      readonly type: string
      readonly behaviour: string
      readonly key: string
    }
  | {
      readonly code: "undeclared-interactive-behaviour"
      readonly type: string
      readonly behaviour: string
    }
  | {
      readonly code: "unpaired-behaviour"
      readonly type: string
      readonly behaviour: string
      readonly requires: string
    }
  | { readonly code: "unknown-role"; readonly type: string; readonly role: string }
  | { readonly code: "duplicate-primitive-type"; readonly type: string }

export type PrimitiveRegistry = PrimitiveResolver &
  PropsValidator &
  TextResolver &
  BehaviourResolver &
  FrameResolver &
  CopyDeclarations & {
    /** In registration order, so a catalogue and an audit read predictably. */
    readonly primitives: readonly RegisteredPrimitive[]
    /**
     * The types that declared a given role, in registration order (0114).
     *
     * Empty for a role nothing here declares, which is the honest answer and
     * not a failure: a deployment that registered no heading has no heading,
     * and a consumer deriving a page name from one should show what it shows
     * for a page that has none.
     *
     * Types rather than whole registrations, because every consumer this exists
     * for is matching nodes in a tree, and a node carries a type. A caller that
     * wants the registration has `primitives` and this is not in its way.
     */
    readonly typesWithRole: (role: PrimitiveRole) => readonly PrimitiveType[]
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
    case "undeclared-frame-prop":
      return `"${error.type}" says it frames "${error.prop}", which its props schema does not declare; the seam would then check nothing and the frame would render whatever the tree said`
    case "undeclared-copy-prop":
      return `"${error.type}" says a reader reads "${error.prop}", which its props schema does not declare; a preview built on that declaration would report a word the page never shows, and go on reporting it after the prop was renamed`
    case "undeclared-interactive-prop":
      return `"${error.type}" says it renders a target when "${error.prop}" is set, and its schema declares no such prop; a trigger naming a prop that cannot arrive is a target the Gate will never see`
    case "unknown-behaviour":
      return `"${error.type}" takes a behaviour called "${error.behaviour}" and the runtime has none; a behaviour is implemented here, not registered, so the vocabulary is the list in \`render/behaviour.ts\``
    case "unnamed-behaviour":
      return `"${error.type}" takes the "${error.behaviour}" behaviour and declares no "${error.key}" text; a control whose name a deployment cannot translate is the failure the text seam exists to prevent`
    case "undeclared-interactive-behaviour":
      return `"${error.type}" takes the "${error.behaviour}" behaviour, which renders a target, and declares no \`interactive\`; the Gate would then allow one inside an anchor, where a browser silently drops one of the two`
    case "unpaired-behaviour":
      return `"${error.type}" takes the "${error.behaviour}" behaviour and not "${error.requires}", which it does nothing without; it would render a control that asks a region nothing opens to close`
    case "unknown-role":
      return `"${error.type}" declares the role "${error.role}", which the runtime has none of; the vocabulary is closed and its members are ${PRIMITIVE_ROLES.map((role) => `"${role}"`).join(", ")} — and a misspelling accepted here would read to every consumer as a primitive that declares no role at all`
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

/**
 * A framable prop that the schema does not declare, if there is one.
 *
 * The same check `undeclaredTriggerProp` makes and with more riding on it. An
 * interactivity declaration that has drifted makes the Gate wrong about the
 * page; a frame declaration that has drifted makes the origin allowlist stop
 * applying to a URL that still reaches an `iframe` — and it fails *open*, which
 * is the direction a security check must never fail in silence.
 *
 * A schema whose fields cannot be enumerated answers `undefined` and is left
 * alone, for the reason given there: "I cannot tell you" is not "there are
 * none".
 */
const undeclaredFrameProp = (entry: PrimitiveEntry): string | undefined => {
  const { frames, declaredProps } = entry
  if (frames.length === 0 || !declaredProps) return undefined

  const declared = new Set(declaredProps.map((prop) => prop.name))

  return frames.find((prop) => !declared.has(prop))
}

/**
 * A copy prop that the schema does not declare, if there is one.
 *
 * The third of these checks, and the one with the least riding on it: a drifted
 * copy declaration makes a preview quieter than the page, where a drifted frame
 * declaration makes an allowlist stop applying. It is here anyway because the
 * failure has the same shape — a prop renamed, a declaration left pointing at
 * nothing, and no way to see it from the outside — and because a reading that
 * has silently stopped reporting a headline number is a reading somebody is
 * approving changes against.
 *
 * A schema whose fields cannot be enumerated answers `undefined` and is left
 * alone, and so is a primitive that declared no copy at all — there is nothing
 * to check in either case, and `[]` has nothing to check by construction.
 */
const undeclaredCopyProp = (entry: PrimitiveEntry): string | undefined => {
  const { copy, declaredProps } = entry
  if (!copy || copy.length === 0 || !declaredProps) return undefined

  const declared = new Set(declaredProps.map((prop) => prop.name))

  return copy.find((prop) => !declared.has(prop))
}

/**
 * The declared behaviours, or the first thing wrong with them.
 *
 * Four checks, and each one is the whole of what can be known without calling
 * the component: the name is in the vocabulary, the strings its control needs
 * are strings this primitive declares, a primitive taking a control says it
 * renders a target, and a control that answers to another one was declared
 * beside it. Whether the primitive actually *places* what it declared needs the
 * component called, which is the audit's job and not this one's.
 */
const registeredBehaviours = (
  entry: PrimitiveEntry
): Result<readonly BehaviourName[], RegistryError> => {
  const names: BehaviourName[] = []

  for (const behaviour of entry.behaviours) {
    if (!isBehaviourName(behaviour)) {
      return err({ code: "unknown-behaviour", type: entry.type, behaviour })
    }

    const missing = BEHAVIOURS[behaviour].text.find(
      (key) => (entry.text[key] ?? "").trim() === ""
    )

    if (missing !== undefined) {
      return err({ code: "unnamed-behaviour", type: entry.type, behaviour, key: missing })
    }

    if (BEHAVIOURS[behaviour].rendersControl && !entry.interactive) {
      return err({ code: "undeclared-interactive-behaviour", type: entry.type, behaviour })
    }

    /**
     * Checked against the entry's own raw list rather than against `names`, so
     * the two may be declared in either order — a primitive that names the
     * cross before the trigger is not making a mistake.
     */
    const requires = BEHAVIOURS[behaviour].requires
    if (requires !== undefined && !entry.behaviours.includes(requires)) {
      return err({ code: "unpaired-behaviour", type: entry.type, behaviour, requires })
    }

    names.push(behaviour)
  }

  return ok(names)
}

/**
 * The declared role, checked — `undefined` for the primitive that declared none,
 * which is most of them.
 *
 * Shaped like `registeredBehaviours` because it is the same job: an entry
 * carries the declaration raw, the registry is the boundary that decides whether
 * it is a member, and a string that is not one is refused rather than dropped.
 */
const registeredRole = (
  entry: PrimitiveEntry
): Result<PrimitiveRole | undefined, RegistryError> => {
  const role = entry.role

  if (role === undefined) return ok(undefined)
  if (!isPrimitiveRole(role)) return err({ code: "unknown-role", type: entry.type, role })

  return ok(role)
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

  const unframeable = undeclaredFrameProp(entry)
  if (unframeable !== undefined) {
    return err({ code: "undeclared-frame-prop", type: entry.type, prop: unframeable })
  }

  const unreadable = undeclaredCopyProp(entry)
  if (unreadable !== undefined) {
    return err({ code: "undeclared-copy-prop", type: entry.type, prop: unreadable })
  }

  const behaviours = registeredBehaviours(entry)
  if (!behaviours.ok) return behaviours

  const role = registeredRole(entry)
  if (!role.ok) return role

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
    frames: entry.frames,
    behaviours: behaviours.value,
    role: role.value,
    copy: entry.copy ? Object.freeze([...entry.copy]) : undefined,
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
  const byRole = new Map<PrimitiveRole, PrimitiveType[]>()
  const primitives: RegisteredPrimitive[] = []

  for (const entry of entries) {
    const registered = registerEntry(entry)
    if (!registered.ok) return registered

    if (byType.has(registered.value.type)) {
      return err({ code: "duplicate-primitive-type", type: registered.value.type })
    }

    byType.set(registered.value.type, registered.value)
    primitives.push(registered.value)

    const { role } = registered.value

    if (role !== undefined) {
      const claimed = byRole.get(role)

      if (claimed) claimed.push(registered.value.type)
      else byRole.set(role, [registered.value.type])
    }
  }

  /**
   * Frozen before anything can be handed one. `typesWithRole` returns the list
   * itself rather than a copy — a consumer may call it per row of a listing —
   * and an unfrozen array shared that way is one `push` away from a deployment's
   * registry changing under a rendered page. The same reason `freezeText` copies
   * and freezes, one collection along.
   */
  for (const types of byRole.values()) Object.freeze(types)

  return ok({
    primitives,
    resolve: (type: PrimitiveType) => byType.get(type)?.component,
    validateProps: (type: PrimitiveType, props: JsonObject): PropsVerdict =>
      byType.get(type)?.validate(props) ?? { outcome: "undeclared" },
    textFor: (type: PrimitiveType): PrimitiveText<string> => byType.get(type)?.text ?? NO_TEXT,
    behavioursFor: (type: PrimitiveType): readonly BehaviourName[] =>
      byType.get(type)?.behaviours ?? NO_BEHAVIOUR_NAMES,
    framePropsFor: (type: PrimitiveType): readonly string[] =>
      byType.get(type)?.frames ?? NO_FRAME_PROPS,
    /**
     * `undefined` for a type nobody registered as well as for one that declared
     * nothing, and the two collapsing here is correct: neither has said what a
     * reader reads, and a consumer that treated an unknown type as showing no
     * words would under-report the same way this exists to stop.
     */
    copyFor: (type: PrimitiveType): readonly string[] | undefined => byType.get(type)?.copy,
    typesWithRole: (role: PrimitiveRole): readonly PrimitiveType[] =>
      byRole.get(role) ?? NO_TYPES,
  })
}
