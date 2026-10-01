import type { ZodType, ZodTypeAny, ZodTypeDef } from "zod"

import { catalogueFields, closedChoices, type CataloguedProp, type ClosedChoice } from "../catalogue.js"
import type { InteractiveWhen } from "../interactivity.js"
import type { JsonObject, JsonObjectView } from "../json.js"
import type { BehaviorName } from "../render/behavior.js"
import type { LoomPrimitive } from "../render/primitive.js"
import type { PropsIssue, PropsVerdict } from "../render/props.js"
import type { BindingDeclaration } from "../render/reads.js"
import type { UnshownDeclaration } from "../render/unshown.js"
import { NO_TEXT, type PrimitiveText } from "../render/text.js"
import type { PrimitiveRole } from "../role.js"

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
 *   declaration the audit checks against behavior rather than taking on trust.
 * - `frames` — which of its props reach an `iframe`, so the render seam can
 *   hold each one against the origins the deployment permits (0095). Optional,
 *   and unlike `submits` it is read at render time: nothing else in the system
 *   can tell a `src` bound for a frame from a `src` bound for an image.
 * - `role` — what part it plays, so a consumer can ask the registry a
 *   categorical question instead of matching on the type string (0114).
 *   Optional, read by nothing in the runtime, and one of two declarations here
 *   whose whole audience is outside this package.
 * - `copy` — which of its props a reader reads as words, so a preview, a review
 *   queue or a search can say what a node says (0122). Optional, read by
 *   nothing in the runtime, and the one declaration where leaving it out and
 *   declaring it empty are different answers.
 * - `reads` — which binding names it reads an answer under, so a model can be
 *   told them and the walk can say when a tree asked under a name this
 *   primitive never reads (0181). Each entry is a fixed name or the name a prop
 *   gives (0184). Optional, and the second declaration where leaving it out and
 *   declaring it empty differ.
 * - `unshown` — its own reading of the answers it was given, so the walk can say
 *   that eleven of twelve rows arrived and were not drawn (0206). The only
 *   declaration here that is a function, because how many rows survived a shape
 *   is not data about a primitive. Optional, and read at render time.
 */

export type PrimitiveDefinition<
  TProps extends JsonObjectView = JsonObject,
  TText extends string = never,
  TBehavior extends BehaviorName = never,
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
   * The props whose values this primitive puts in an `iframe` — `["src"]` on an
   * embed. Empty for everything else, which is every other primitive there is.
   *
   * A list of prop names rather than a `true`, because the runtime has to know
   * *which* string to check and there is nothing it could infer that from: a
   * `src` reaching an `iframe` and a `src` reaching an `img` are the same JSON.
   * The named props must be props the schema declares; the registry refuses a
   * declaration that names one it does not, the same way it refuses an
   * `interactive` trigger that has been renamed out from under it — the drift
   * that actually happens is a prop renamed and a declaration left pointing at
   * nothing, which would silently stop checking the URL rather than fail.
   */
  readonly frames?: readonly string[]
  /**
   * The controls this primitive takes from the runtime's closed behavior
   * vocabulary — `["copy"]` on a code panel. Optional, and empty for almost
   * everything: a Loom page is data, and a behavior is the exception that has
   * to be asked for by name.
   *
   * Declaring one is a claim with two consequences the registry checks. The
   * strings the control needs become strings this primitive must declare, so it
   * has a name in every language the deployment serves; and a control is a
   * target the reader aims at, so this primitive must also declare itself
   * `interactive` or the Gate will let one sit inside an anchor.
   */
  readonly behaviors?: readonly TBehavior[]
  /**
   * What part this primitive plays — `"heading"` on anything a reader takes as
   * the title of what follows, whatever it is called. Optional, and absent on
   * almost everything: most primitives are an arrangement or a surface and play
   * no part a consumer asks about categorically.
   *
   * A role travels in the opposite direction from every other declaration here.
   * `interactive` and `frames` are read by the runtime and constrain what a tree
   * may do; a role is read by a *host* and constrains nothing. It is here rather
   * than in a host's own table for the same reason `description` is: the author
   * of the component is the one who knows, and a table maintained beside the
   * registry goes stale the day somebody registers a second heading.
   *
   * Typed rather than free — see `role.ts` for why the vocabulary is closed and
   * why it currently has one member. A host writing JavaScript can still hand
   * over a string the runtime does not know, so the registry refuses one rather
   * than letting a misspelling read as "declares no role".
   */
  readonly role?: PrimitiveRole
  /**
   * The props whose values a reader reads as words — `["value", "label",
   * "caption"]` on a stat, `[]` on an arrangement that shows none of its own.
   *
   * Optional, and the distinction between `[]` and leaving it out is the whole
   * of what it buys (0122). `[]` says *this primitive shows no words of its
   * own*; absence says *nobody has said*, and `copyIn` reports the second and
   * trusts the first. A default would collapse them, which is why there is
   * none.
   *
   * Read by nothing in the runtime, like `role` and `submits`: it changes no
   * render and constrains no tree. The named props must be props the schema
   * declares, and the registry refuses a declaration that names one it does
   * not — the same drift `frames` and `interactive` are checked for, with less
   * riding on it and the same silence when it happens.
   */
  readonly copy?: readonly string[]
  /**
   * The binding names this primitive reads an answer under — `["entries"]` on a
   * feed, `[]` on everything that draws only what the tree wrote.
   *
   * A tree's `loom:data` maps a *name* to a source, and the name is how the
   * primitive reading the answer finds it. Until this existed, the name
   * was the one thing in that declaration nothing could check: an unregistered
   * source is refused and a param the source did not declare is refused, but a
   * name nothing reads resolves cleanly and is then read by nobody. Declaring
   * the names is what lets something say so.
   *
   * An entry is either a name or `{ fromProp, default }`, which says *under
   * whichever name this prop gives, and this one when it gives none* (0184).
   * The second form is what a primitive that takes its binding name from a prop
   * has to declare, because a fixed list could only say something untrue about
   * it.
   *
   * Optional, and — like `copy`, and for the same reason — leaving it out and
   * declaring it empty are different answers. `[]` says *this primitive reads
   * no data*; absence says *nobody has said*, and the seam reports the second
   * and trusts the first. A default would collapse them into a claim no author
   * made, and the claim would be wrong for every bound primitive written before
   * anyone thought to declare one.
   *
   * A name is checked against the binding grammar rather than against the props
   * schema, because it is not a prop name. The one half that *is* a prop name —
   * `fromProp` — is checked against the schema the way `copy` and `frames` are,
   * so a declaration cannot go on naming a prop that was renamed away.
   */
  readonly reads?: readonly BindingDeclaration[]
  /**
   * What this primitive made of each answer it was given: the rows it found and
   * the rows it placed. The walk reports the ones where those differ.
   *
   * The one way a binding can be wrong that nothing outside the component can
   * see. A source can answer perfectly, under a name the primitive reads, with
   * rows the primitive then declines one at a time — because a row's shape is
   * the primitive's own, and eleven of twelve failing it is the author's problem
   * and nobody else's. The reader is told without a count (0175); this is how
   * the author is told with one (0206).
   *
   * A function, where everything above is data, and that is the honest shape
   * rather than a shortcut. `reads` is a list of names, and a name is data —
   * which is why it has a `fromProp` form instead of a callback (0184). A count
   * of rows that survived a schema is not data about a primitive; it is the
   * primitive reading an answer, and the primitive already contains that code,
   * because it had to decide what to skip in order to skip it. Declare the
   * function the component calls and the two cannot disagree.
   *
   * Pure, synchronous, and handed exactly what the component is handed of the
   * same two things. It may not throw and may not return a reading that cannot
   * describe an answer; both are caught and reported as
   * `unshown-unreadable` against the primitive rather than allowed to cost the
   * page, because rendering is total.
   */
  readonly unshown?: UnshownDeclaration
  readonly component: LoomPrimitive<TProps, TText, TBehavior>
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
  /** Declared framable prop names, still raw: the registry is what checks them. */
  readonly frames: readonly string[]
  /** Declared behavior names, still raw: the registry is what checks them. */
  readonly behaviors: readonly string[]
  /**
   * The declared role, still raw: the registry is what checks it, for the same
   * reason it checks a behavior name. `undefined` for the primitive that plays
   * no part a consumer asks about, which is most of them.
   */
  readonly role: string | undefined
  /**
   * Declared copy prop names, still raw: the registry is what checks them.
   * `undefined` is carried through rather than defaulted to `[]`, because the
   * two mean different things here and all the way out to `copyIn`.
   */
  readonly copy: readonly string[] | undefined
  /**
   * Declared binding names, still raw: the registry is what checks them.
   * `undefined` is carried through rather than defaulted to `[]`, because the
   * two mean different things here and all the way out to the render walk.
   */
  readonly reads: readonly BindingDeclaration[] | undefined
  /**
   * The declared reading of this node's answers, or `undefined` where the author
   * has not said. Nothing to check at registration — there are no names in it
   * and no props it could name — so it is carried straight through.
   */
  readonly unshown: UnshownDeclaration | undefined
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
  TBehavior extends BehaviorName = never,
>(
  definition: PrimitiveDefinition<TProps, TText, TBehavior>
): PrimitiveEntry => ({
  type: definition.type,
  description: definition.description,
  slots: definition.slots ?? [],
  text: freezeText(definition.text),
  interactive: definition.interactive,
  submits: definition.submits ?? false,
  frames: definition.frames ?? [],
  behaviors: definition.behaviors ?? [],
  role: definition.role,
  copy: definition.copy,
  reads: definition.reads,
  unshown: definition.unshown,
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
