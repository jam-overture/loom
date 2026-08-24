import { isValidElement, type ReactNode } from "react"

import type { ClosedChoice } from "../catalogue.js"
import { NO_DATA } from "../data/resolution.js"
import { nodeIdSchema } from "../ids.js"
import type { JsonObject } from "../json.js"
import { primitiveTypeSchema } from "../primitive-type.js"
import { LOOM_NODE_ATTRIBUTE, LOOM_TYPE_ATTRIBUTE, type EditableAttributes } from "../render/editable.js"
import { NO_BEHAVIOURS, type BehaviourName, type PrimitiveBehaviours } from "../render/behaviour.js"
import { NO_SLOTS, type LoomPrimitive, type LoomPrimitiveProps } from "../render/primitive.js"
import { NO_TEXT, type PrimitiveText } from "../render/text.js"
import { err, ok, type Result } from "../result.js"
import { paletteSlotSchema, type PaletteSlot } from "../theme/theme.js"
import type { SubmissionOutcome } from "../submit/resolution.js"

/**
 * The conformance probe (0010).
 *
 * Edit mode decorates by handing a primitive `loom.editable` and trusting it to
 * spread the attributes onto its own root element. A primitive that ignores them
 * renders perfectly and is invisible to the portal — nothing to click, no id to
 * address, and no error anywhere. 0010 asked §4 to catch that at registration
 * rather than leave it as a runtime surprise.
 *
 * This is a probe, not a proof. It calls the component once, with a synthetic
 * render context, and looks through the elements it returned for the attributes
 * it was given. That answers the common case honestly and says so when it
 * cannot answer at all:
 *
 * - a component that hands a *copy* of the decoration to another component
 *   reads as `not-decorated`, which is a false negative — identity is all there
 *   is to go on once the object has been rebuilt under a name of the
 *   primitive's choosing
 * - a component that uses hooks, or is a class, cannot be called outside a
 *   renderer and reads as `not-probeable`
 *
 * Both are reported rather than guessed at, and neither blocks registration —
 * `registry.ts` never calls a primitive. Enforcement is the host's call, which
 * is why the verdict is a value.
 */

export type ConformanceVerdict =
  | { readonly outcome: "decorates" }
  | { readonly outcome: "not-decorated" }
  | { readonly outcome: "not-probeable"; readonly reason: string }

const PROBE_NODE_ID = nodeIdSchema.parse("n_probe")
const PROBE_TYPE = primitiveTypeSchema.parse("loom.probe")
const PROBE_CHILDREN = "loom-probe-children"

/**
 * A probe is handed the primitive's own declared strings rather than an empty
 * map. A component that reads `loom.text.excluded` and formats it would throw on
 * `undefined` and read as `not-probeable` — a false negative produced entirely
 * by the probe, for a primitive that is correct.
 */
const probeProps = (
  editable: EditableAttributes,
  text: PrimitiveText<string>,
  props: JsonObject
): LoomPrimitiveProps => ({
  loom: {
    nodeId: PROBE_NODE_ID,
    type: PROBE_TYPE,
    editable,
    slots: NO_SLOTS,
    data: NO_DATA,
    text,
    behaviours: NO_BEHAVIOURS,
  },
  props,
  children: PROBE_CHILDREN,
})

/**
 * The prop configurations a primitive is probed under (0075).
 *
 * The default configuration first, then each closed choice's values one at a
 * time with everything else left alone. The **sum** of the choices rather than
 * their product: a schema with six enums of eight members is forty-eight
 * renders this way and two hundred and sixty thousand the other, and the cost
 * of the cheap answer is that a primitive which places children only under two
 * particular values together is not found. Nothing in the library is shaped
 * that way, and a primitive that were would be one nobody can read.
 */
export const probeConfigurations = (choices: readonly ClosedChoice[]): readonly JsonObject[] => [
  {},
  ...choices.flatMap(({ name, options }) => options.map((option) => ({ [name]: option }))),
]

const DEFAULT_CONFIGURATIONS: readonly JsonObject[] = [{}]

/** The marker handed to a declared slot, unique per name so a miss names itself. */
const slotMarker = (name: string): string => `loom-probe-slot:${name}`

/** The same, for a declared behaviour's control. */
const behaviourMarker = (name: string): string => `loom-probe-behaviour:${name}`

/** Whether this element, or anything it returned, carries the probe's decoration. */
const carriesDecoration = (node: ReactNode, editable: EditableAttributes): boolean => {
  if (Array.isArray(node)) return node.some((child: ReactNode) => carriesDecoration(child, editable))
  if (!isValidElement(node)) return false

  const props: Readonly<Record<string, unknown>> = node.props as Readonly<Record<string, unknown>>

  for (const [key, value] of Object.entries(props)) {
    if (key === LOOM_NODE_ATTRIBUTE && value === PROBE_NODE_ID) return true

    /**
     * A primitive that hands `loom` or `loom.editable` to another component is
     * decorating too — it has delegated its root, and the attributes will reach
     * the DOM through whatever it delegated to. Identity is the test, since a
     * rebuilt object cannot be told apart from an unrelated one.
     */
    if (value === editable) return true
    if (typeof value === "object" && value !== null && "editable" in value && value.editable === editable) {
      return true
    }
  }

  return carriesDecoration(props["children"] as ReactNode, editable)
}

/**
 * A `LoomPrimitive` is either a function component or a class, and only the
 * first can be called as a plain function. `typeof` cannot tell them apart — a
 * class is a function too — so the marker React puts on a class component's
 * prototype is what decides it.
 */
type ProbeableComponent = (props: LoomPrimitiveProps) => ReactNode

const asProbeable = (primitive: LoomPrimitive): Result<ProbeableComponent, string> => {
  if (typeof primitive !== "function") return err("not a function component")

  const prototype: unknown = (primitive as { readonly prototype?: unknown }).prototype

  if (typeof prototype === "object" && prototype !== null && "isReactComponent" in prototype) {
    return err("class components cannot be called outside a renderer")
  }

  return ok(primitive as ProbeableComponent)
}

/** Calls a probeable component, turning whatever it throws into a reason. */
const call = (probeable: ProbeableComponent, props: LoomPrimitiveProps): Result<ReactNode, string> => {
  try {
    return ok(probeable(props))
  } catch (thrown) {
    return err(thrown instanceof Error ? thrown.message : String(thrown))
  }
}

/**
 * Decoration is a promise that holds however the primitive is configured, so
 * one configuration that fails to decorate makes the answer `not-decorated`
 * even if the rest pass. A configuration that throws answers nothing either
 * way and is skipped; when none of them answer, the reason from the first is
 * what the caller gets, because the default configuration is first and its
 * failure is the one worth reading.
 */
export const probeEditableDecoration = (
  primitive: LoomPrimitive,
  text: PrimitiveText<string> = NO_TEXT,
  configurations: readonly JsonObject[] = DEFAULT_CONFIGURATIONS
): ConformanceVerdict => {
  const probeable = asProbeable(primitive)
  if (!probeable.ok) return { outcome: "not-probeable", reason: probeable.error }

  const editable: EditableAttributes = {
    [LOOM_NODE_ATTRIBUTE]: PROBE_NODE_ID,
    [LOOM_TYPE_ATTRIBUTE]: PROBE_TYPE,
  }

  const called = configurations.map((props) => call(probeable.value, probeProps(editable, text, props)))
  const answered = called.flatMap((result) => (result.ok ? [result.value] : []))

  if (answered.length === 0) {
    const [first] = called

    return {
      outcome: "not-probeable",
      reason: `calling it outside a renderer threw: ${first && !first.ok ? first.error : "no configuration answered"}`,
    }
  }

  return answered.every((node) => carriesDecoration(node, editable))
    ? { outcome: "decorates" }
    : { outcome: "not-decorated" }
}

/**
 * The second probe: does a primitive place what it was handed?
 *
 * A declared behaviour is a promise of the same kind and fails the same way. A
 * primitive that asks for the copy control and never reads
 * `loom.behaviours.copy` registers cleanly, renders correctly and simply has no
 * copy button — the gap the behaviour was declared to close, still open, with
 * the declaration saying otherwise.
 *
 * A declared slot is a promise. The catalogue tells a model the region exists,
 * a proposal puts content there, and a primitive that never reads
 * `loom.slots.aside` drops it — rendering correctly, reporting nothing, with the
 * content gone from the page and still present in the tree. That is the same
 * failure shape as ignoring `loom.editable`, and 0051 made it more likely by
 * making slots mean something: before, a region nobody placed still appeared
 * inline in `children`.
 *
 * It answers a second question at the same time, because one call can. A
 * primitive that renders no `children` is a leaf: `loom.stat` holds its value
 * and label as props, so a text node underneath it has nowhere to go and is
 * dropped just as silently. The renderer cannot tell a leaf from a container —
 * the registry records declared slots, not whether a component reads
 * `children` — but the probe can simply look, which is cheaper than asking
 * every author to declare it and impossible to get out of step with the code.
 *
 * Reported, never enforced, for the reason `audit.ts` gives: a primitive that
 * deliberately ignores a region under some prop combination is a design choice.
 *
 * **It answers from every configuration the schema closes over** (0075), not
 * from one render. `loom.field` places children only when its `type` is
 * `select`, because only a select has choices, and probed at its default type
 * alone it reported as a leaf — a primitive with nowhere to put a child node,
 * which is false and is the one thing a portal reads this to decide. A claim
 * about a primitive that holds under one prop value is not a claim about the
 * primitive.
 */

/** A configuration the schema accepts that the component threw on. */
export type ProbeFailure = {
  readonly props: JsonObject
  readonly reason: string
}

export type PlacementVerdict =
  | {
      readonly outcome: "probed"
      /** Declared slots that no probed configuration placed. */
      readonly unplacedSlots: readonly string[]
      /** Declared behaviours whose control no probed configuration placed. */
      readonly unplacedBehaviours: readonly BehaviourName[]
      /** Whether any probed configuration placed the children it was handed. */
      readonly rendersChildren: boolean
      /** The configurations that answered — `{}` alone when the schema closes over nothing. */
      readonly probed: readonly JsonObject[]
      /**
       * Configurations built from the primitive's own schema that it threw on.
       * Never a reason to distrust the verdict — the configurations that
       * answered still answered — and always a fault: a component that throws
       * on a value its schema accepts is one a valid tree can crash a page with.
       */
      readonly threw: readonly ProbeFailure[]
    }
  | { readonly outcome: "not-probeable"; readonly reason: string }

/**
 * Whether the marker string appears anywhere in what the component returned.
 *
 * Every prop is searched, not only `children`: a primitive that hands a region
 * to another component as `header={loom.slots.header}` has placed it, and the
 * probe should not call that a drop because the content left through a prop it
 * did not expect.
 */
const containsMarker = (node: unknown, marker: string): boolean => {
  if (node === marker) return true
  if (Array.isArray(node)) return node.some((child: unknown) => containsMarker(child, marker))
  if (!isValidElement(node)) return false

  return Object.values(node.props as Readonly<Record<string, unknown>>).some((value) =>
    containsMarker(value, marker)
  )
}

export const probePlacement = (
  primitive: LoomPrimitive,
  declaredSlots: readonly string[],
  text: PrimitiveText<string> = NO_TEXT,
  configurations: readonly JsonObject[] = DEFAULT_CONFIGURATIONS,
  declaredBehaviours: readonly BehaviourName[] = []
): PlacementVerdict => {
  const probeable = asProbeable(primitive)
  if (!probeable.ok) return { outcome: "not-probeable", reason: probeable.error }

  const slots: Record<string, ReactNode> = Object.create(null) as Record<string, ReactNode>
  for (const name of declaredSlots) slots[name] = slotMarker(name)

  const behaviours: Record<string, ReactNode> = Object.create(null) as Record<string, ReactNode>
  for (const name of declaredBehaviours) behaviours[name] = behaviourMarker(name)

  const attempts = configurations.map((props) => ({
    props,
    result: call(probeable.value, {
      loom: {
        nodeId: PROBE_NODE_ID,
        type: PROBE_TYPE,
        slots,
        data: NO_DATA,
        text,
        behaviours: behaviours as PrimitiveBehaviours<BehaviourName>,
      },
      props,
      children: PROBE_CHILDREN,
    }),
  }))

  const answered = attempts.flatMap((attempt) => (attempt.result.ok ? [attempt] : []))

  if (answered.length === 0) {
    const [first] = attempts
    const reason = first && !first.result.ok ? first.result.error : "no configuration answered"

    return { outcome: "not-probeable", reason: `calling it outside a renderer threw: ${reason}` }
  }

  const placed = (marker: string): boolean =>
    answered.some((attempt) => attempt.result.ok && containsMarker(attempt.result.value, marker))

  return {
    outcome: "probed",
    unplacedSlots: declaredSlots.filter((name) => !placed(slotMarker(name))),
    unplacedBehaviours: declaredBehaviours.filter((name) => !placed(behaviourMarker(name))),
    rendersChildren: placed(PROBE_CHILDREN),
    probed: answered.map((attempt) => attempt.props),
    threw: attempts.flatMap((attempt) =>
      attempt.result.ok ? [] : [{ props: attempt.props, reason: attempt.result.error }]
    ),
  }
}

/**
 * The third probe: does a primitive that posts put the address on the page?
 *
 * `loom.submit` is the one thing on the render context whose absence is
 * survivable and whose *silent* absence is not (0065). A tree names an
 * endpoint, a deployment resolves it before the walk, and the primitive is
 * handed a target — but nothing makes it read one. A form that ignores it
 * renders a set of fields and a submit control with no `action` at all, which a
 * browser resolves by posting to the page the form is sitting on. Nothing
 * throws, nothing is logged, and the first person to find out is whoever filled
 * it in.
 *
 * So the probe hands the component a target whose action is a string nothing
 * else would produce, and looks for that string in what came back. Placing the
 * address is the claim, because the address is the whole of what the seam
 * delivers: a primitive that reads the outcome only to choose between two
 * sentences has not connected anything.
 *
 * Its false negative is the one `containsMarker` cannot avoid: a primitive that
 * rebuilds the action — appending a query string, say — has posted somewhere
 * real and reads here as `not-placed`. That is the same bargain the decoration
 * probe makes with identity, and it errs towards reporting a fault that is not
 * one, which a person reading the audit can dismiss in a second. The reverse
 * error is the one this exists to prevent.
 */

export type SubmissionVerdict =
  | { readonly outcome: "places" }
  | { readonly outcome: "not-placed" }
  | { readonly outcome: "not-probeable"; readonly reason: string }

/**
 * Absolute rather than root-relative, and on a hostname that cannot resolve.
 * `endpoint.ts` accepts both shapes, so either would be a legal target; this one
 * is additionally impossible to confuse with a path a primitive computed for
 * itself, which is what makes finding it in the output evidence rather than
 * coincidence.
 */
const PROBE_SUBMIT_ACTION = "https://probe.invalid/loom-probe-submit"

const PROBE_SUBMISSION: SubmissionOutcome = {
  status: "ready",
  target: { action: PROBE_SUBMIT_ACTION, method: "post", fields: [] },
}

/**
 * `some` rather than `every`, matching `probePlacement`. The question is
 * whether this primitive posts at all, and a primitive that renders a form
 * under one layout and a summary under another is answering honestly in both.
 */
export const probeSubmissionPlacement = (
  primitive: LoomPrimitive,
  text: PrimitiveText<string> = NO_TEXT,
  configurations: readonly JsonObject[] = DEFAULT_CONFIGURATIONS
): SubmissionVerdict => {
  const probeable = asProbeable(primitive)
  if (!probeable.ok) return { outcome: "not-probeable", reason: probeable.error }

  const attempts = configurations.map((props) =>
    call(probeable.value, {
      loom: {
        nodeId: PROBE_NODE_ID,
        type: PROBE_TYPE,
        slots: NO_SLOTS,
        data: NO_DATA,
        text,
        behaviours: NO_BEHAVIOURS,
        submit: PROBE_SUBMISSION,
      },
      props,
      children: PROBE_CHILDREN,
    })
  )

  const answered = attempts.flatMap((result) => (result.ok ? [result.value] : []))

  if (answered.length === 0) {
    const [first] = attempts
    const reason = first && !first.ok ? first.error : "no configuration answered"

    return { outcome: "not-probeable", reason: `calling it outside a renderer threw: ${reason}` }
  }

  return answered.some((node) => containsMarker(node, PROBE_SUBMIT_ACTION))
    ? { outcome: "places" }
    : { outcome: "not-placed" }
}

/**
 * The fourth probe: which colours does this primitive put on which grounds?
 *
 * `PALETTE_TEXT_PAIRINGS` in `src/theme/contrast.ts` says of itself that it is
 * *read off `src/primitives` rather than imagined*, and until now that was a
 * promise a person kept by hand. A pairing a new primitive rendered was audited
 * only if somebody remembered to add a row, and the audit's silence about the
 * rest read exactly like a pass. This answers the question from the components
 * instead, the same way `submits` stopped being a declaration and became an
 * observation.
 *
 * ## Painted and floating
 *
 * A primitive that sets `color` under a ground it painted itself has said
 * everything about that pair: both ends are its own and no container can change
 * them. That is a **painted** pairing.
 *
 * A primitive that sets `color` and paints no ground under it — `loom.perk`'s
 * subtle note, `loom.milestone`'s marker — has said only half. The other half
 * is whatever it is placed in, and 0008 leaves parentage to the tree, so the
 * ground is any ground a container puts children on. Those inks are reported
 * as **floating**, with the grounds separately, and pairing them up is
 * `pairings.ts`'s job because it needs the whole registry to know what the
 * grounds are.
 *
 * ## What it does not see
 *
 * Only `children` is walked, matching `carriesDecoration`, so an element handed
 * to another component through a prop of the primitive's own naming is not
 * followed. Only `background`, `backgroundColor` and `color` are read, and only
 * where the value is exactly the `var(--loom-…)` form `colour()` produces — a
 * primitive that composes a gradient or interpolates a variable into a longhand
 * answers nothing rather than a guess, for the reason `contrastRatio` declines
 * a colour it would have to parse.
 */

export type ColourPairing = {
  readonly foreground: PaletteSlot
  readonly background: PaletteSlot
}

export type ColourVerdict =
  | {
      readonly outcome: "probed"
      /** Ink and ground both set by this primitive. */
      readonly painted: readonly ColourPairing[]
      /** Ink set here, ground left to whatever this is placed in. */
      readonly floating: readonly PaletteSlot[]
      /** Grounds this primitive puts its declared children and slots on. */
      readonly childGrounds: readonly PaletteSlot[]
    }
  | { readonly outcome: "not-probeable"; readonly reason: string }

/** `colour()` emits `var(--loom-<slot>)` and nothing else does. */
const SLOT_VARIABLE = /^var\(--loom-([a-z-]+)\)$/

const slotOf = (value: unknown): PaletteSlot | undefined => {
  if (typeof value !== "string") return undefined

  const named = SLOT_VARIABLE.exec(value)?.[1]
  const parsed = named === undefined ? undefined : paletteSlotSchema.safeParse(named)

  return parsed?.success === true ? parsed.data : undefined
}

const groundOf = (style: Readonly<Record<string, unknown>>): PaletteSlot | undefined =>
  slotOf(style["background"]) ?? slotOf(style["backgroundColor"])

type Paint = {
  readonly painted: ColourPairing[]
  readonly floating: PaletteSlot[]
  readonly childGrounds: PaletteSlot[]
}

const collectPaint = (
  node: ReactNode,
  ground: PaletteSlot | undefined,
  markers: ReadonlySet<string>,
  into: Paint
): void => {
  if (Array.isArray(node)) {
    for (const child of node as readonly ReactNode[]) collectPaint(child, ground, markers, into)

    return
  }

  if (typeof node === "string") {
    if (markers.has(node) && ground !== undefined) into.childGrounds.push(ground)

    return
  }

  if (!isValidElement(node)) return

  const props: Readonly<Record<string, unknown>> = node.props as Readonly<Record<string, unknown>>
  const style = props["style"]
  const own = typeof style === "object" && style !== null ? (style as Readonly<Record<string, unknown>>) : undefined

  const below = own === undefined ? ground : (groundOf(own) ?? ground)
  const ink = own === undefined ? undefined : slotOf(own["color"])

  if (ink !== undefined) {
    if (below === undefined) into.floating.push(ink)
    else into.painted.push({ foreground: ink, background: below })
  }

  collectPaint(props["children"] as ReactNode, below, markers, into)
}

const uniqueSlots = (slots: readonly PaletteSlot[]): readonly PaletteSlot[] => [...new Set(slots)].sort()

const uniquePairings = (pairings: readonly ColourPairing[]): readonly ColourPairing[] =>
  [...new Map(pairings.map((pairing) => [`${pairing.foreground}|${pairing.background}`, pairing])).values()].sort(
    (a, b) => `${a.foreground}|${a.background}`.localeCompare(`${b.foreground}|${b.background}`)
  )

/**
 * The union across every configuration, rather than the intersection the
 * decoration probe takes. Decoration is a promise that has to hold however the
 * primitive is configured; a colour pairing is a fact about one configuration,
 * and a `loom.section` that paints `accent-subtle` only under `tone: "accent"`
 * renders that pairing on a real page whatever the other tones do.
 */
export const probeColourPairings = (
  primitive: LoomPrimitive,
  declaredSlots: readonly string[] = [],
  text: PrimitiveText<string> = NO_TEXT,
  configurations: readonly JsonObject[] = DEFAULT_CONFIGURATIONS
): ColourVerdict => {
  const probeable = asProbeable(primitive)
  if (!probeable.ok) return { outcome: "not-probeable", reason: probeable.error }

  const slots: Record<string, ReactNode> = Object.create(null) as Record<string, ReactNode>
  for (const name of declaredSlots) slots[name] = slotMarker(name)

  const markers = new Set<string>([PROBE_CHILDREN, ...declaredSlots.map(slotMarker)])

  const attempts = configurations.map((props) =>
    call(probeable.value, {
      loom: {
        nodeId: PROBE_NODE_ID,
        type: PROBE_TYPE,
        slots,
        data: NO_DATA,
        text,
        behaviours: NO_BEHAVIOURS,
      },
      props,
      children: PROBE_CHILDREN,
    })
  )

  const answered = attempts.flatMap((result) => (result.ok ? [result.value] : []))

  if (answered.length === 0) {
    const [first] = attempts
    const reason = first && !first.ok ? first.error : "no configuration answered"

    return { outcome: "not-probeable", reason: `calling it outside a renderer threw: ${reason}` }
  }

  const into: Paint = { painted: [], floating: [], childGrounds: [] }
  for (const node of answered) collectPaint(node, undefined, markers, into)

  return {
    outcome: "probed",
    painted: uniquePairings(into.painted),
    floating: uniqueSlots(into.floating),
    childGrounds: uniqueSlots(into.childGrounds),
  }
}
