import type { ZodType, ZodTypeAny, ZodTypeDef } from "zod"

import { catalogueFields, closedChoices, type CataloguedProp, type ClosedChoice } from "../catalogue.js"
import type { InteractiveWhen } from "../interactivity.js"
import type { JsonObject, JsonObjectView } from "../json.js"
import type { BehaviourName } from "../render/behaviour.js"
import type { LoomPrimitive } from "../render/primitive.js"
import type { PropsIssue, PropsVerdict } from "../render/props.js"
import { NO_TEXT, type PrimitiveText } from "../render/text.js"

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
 * - `text` — the strings the primitive owns rather than reads from the tree, in
 *   the author's own language, so a deployment has something to translate and a
 *   model has nothing to write. Optional: most primitives own no strings at all.
 * - `interactive` — whether it renders a target the reader aims at, so the Gate
 *   can refuse a change that puts one inside another (0064). Optional, and the
 *   only field here that is read by nothing at render time: it exists so the
 *   author who knows the component emits an anchor is the one who says so.
 * - `submits` — whether it posts, so a deployment can be told that a primitive
 *   which needs a destination is registered and that the seam feeding it is
 *   wired (0065). Optional, read by nothing at render time, and the one
 *   declaration the audit checks against behaviour rather than taking on trust.
 */

export type PrimitiveDefinition<
  TProps extends JsonObjectView = JsonObject,
  TText extends string = never,
  TBehaviour extends BehaviourName = never,
> = {
  readonly type: string
  readonly description: string
  readonly props: ZodType<TProps, ZodTypeDef, unknown>
  readonly slots?: readonly string[]
  /**
   * Declared strings, by key. The keys are inferred, so the component's
   * `loom.text` is typed to exactly what was declared here — an author who
   * reads a key they did not declare finds out at the declaration, which is the
   * same bargain the props schema makes.
   */
  readonly text?: Readonly<Record<TText, string>>
  /**
   * `"always"` for a primitive that is a target however it is configured, or
   * `{ whenProps }` naming the props that make it one — `href` on a card, which
   * is a plain surface without it. The named props must be props the schema
   * declares; the registry refuses a declaration that names one it does not, so
   * a renamed prop cannot leave this quietly pointing at nothing.
   */
  readonly interactive?: InteractiveWhen
  /**
   * `true` for a primitive whose job includes sending what it collected. It
   * takes no conditional form, unlike `interactive`: a card is a target only
   * when the tree gives it an `href`, but a form is a form, and a primitive
   * that posts under one prop value and not another is two primitives.
   *
   * Nothing reads it at render time and nothing needs it to render — a
   * component is handed `loom.submit` whenever its node declared one, declared
   * or not. What it buys is that the audit can tell the two silent failures
   * apart: a primitive that says it posts and places no address, and one that
   * places an address without ever having said it posts.
   */
  readonly submits?: boolean
  /**
   * The controls this primitive takes from the runtime's closed behaviour
   * vocabulary — `["copy"]` on a code panel. Optional, and empty for almost
   * everything: a Loom page is data, and a behaviour is the exception that has
   * to be asked for by name.
   *
   * Declaring one is a claim with two consequences the registry checks. The
   * strings the control needs become strings this primitive must declare, so it
   * has a name in every language the deployment serves; and a control is a
   * target the reader aims at, so this primitive must also declare itself
   * `interactive` or the Gate will let one sit inside an anchor.
   */
  readonly behaviours?: readonly TBehaviour[]
  readonly component: LoomPrimitive<TProps, TText, TBehaviour>
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
  /**
   * The props whose accepted values can be listed, so the conformance probe can
   * ask the primitive what it does under each one rather than under whichever
   * shape it happens to take with no props at all (0075). Empty for the
   * primitive whose rendering does not turn on a closed choice, which is most.
   */
  readonly choices: readonly ClosedChoice[]
  /** Declared strings, keys erased alongside the props type. Empty when none. */
  readonly text: PrimitiveText<string>
  /** Absent for the ordinary primitive, which is not a target at all. */
  readonly interactive: InteractiveWhen | undefined
  /** `false` for the ordinary primitive, which sends nothing anywhere. */
  readonly submits: boolean
  /** Declared behaviour names, still raw: the registry is what checks them. */
  readonly behaviours: readonly string[]
  readonly validate: (props: JsonObject) => PropsVerdict
}

/**
 * Declared text, copied into a frozen null-prototype map at declaration.
 *
 * Copied because the caller keeps a reference to the literal it passed and an
 * entry that shares it is one mutation away from a deployment's strings changing
 * under a rendered page. Null-prototype for the reason `NO_TEXT` gives.
 */
const freezeText = (text: Readonly<Record<string, string>> | undefined): PrimitiveText<string> => {
  if (!text) return NO_TEXT

  const copy: Record<string, string> = Object.create(null) as Record<string, string>

  for (const [key, value] of Object.entries(text)) copy[key] = value

  return Object.freeze(copy)
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
 * Declares a primitive. The generic parameter is inferred from the schema, so
 * the component is checked against what its own schema produces at the point of
 * declaration rather than at the point of registration — an author who reads
 * `props.titel` finds out here.
 */
export const definePrimitive = <
  TProps extends JsonObjectView,
  TText extends string = never,
  TBehaviour extends BehaviourName = never,
>(
  definition: PrimitiveDefinition<TProps, TText, TBehaviour>
): PrimitiveEntry => ({
  type: definition.type,
  description: definition.description,
  slots: definition.slots ?? [],
  text: freezeText(definition.text),
  interactive: definition.interactive,
  submits: definition.submits ?? false,
  behaviours: definition.behaviours ?? [],
  /**
   * The one narrowing cast in the SDK, and the invariant that makes it sound:
   * a registry hands the renderer this component and the validator built from
   * the same definition's schema, and the renderer only renders a node whose
   * props that validator accepted. Widening the props type here without the
   * validator beside it would be unsound, which is why the registry is what
   * exposes both and why neither is exported alone.
   */
  component: definition.component as LoomPrimitive,
  declaredProps: catalogueFields(definition.props as ZodTypeAny),
  choices: closedChoices(definition.props as ZodTypeAny),
  validate: (props) => verdictFor(definition.props, props),
})
