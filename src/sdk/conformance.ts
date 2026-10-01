import { isValidElement, type ReactElement, type ReactNode } from "react"

import type { ClosedChoice } from "../catalogue.js"
import { NO_DATA, type NodeData } from "../data/resolution.js"
import { NO_FRAMES, type FrameOutcome, type NodeFrames } from "../frame/resolution.js"
import { frameOriginSchema } from "../frame/origin.js"
import { nodeIdSchema } from "../ids.js"
import type { JsonObject } from "../json.js"
import { primitiveTypeSchema } from "../primitive-type.js"
import { LOOM_NODE_ATTRIBUTE, LOOM_TYPE_ATTRIBUTE, type EditableAttributes } from "../render/editable.js"
import { NO_BEHAVIORS, type BehaviorName, type PrimitiveBehaviors } from "../render/behavior.js"
import {
  asCallablePrimitive,
  NO_SLOTS,
  type CallablePrimitive,
  type LoomPrimitive,
  type LoomPrimitiveProps,
} from "../render/primitive.js"
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

/** A configuration the schema accepts that the component threw on. */
export type ProbeFailure = {
  readonly props: JsonObject
  readonly reason: string
  /**
   * The binding names the node had answers under when it threw, sorted, and
   * absent when it had none.
   *
   * Without it two failures of `loom.feed` at its default props read as the
   * same line twice, and the one that matters — *it renders until you answer
   * it* — is the one a reader cannot pick out (0185).
   */
  readonly answered?: readonly string[]
}

/**
 * Why a probe declined to answer.
 *
 * 0012 made `not-probeable` a third answer rather than a failure, because a
 * hook-using component and a class component are both legitimate primitives the
 * probe cannot judge. That is still true, and it was hiding a second population
 * that is never legitimate: a component that is perfectly callable and throws on
 * every configuration its own schema accepts.
 *
 * The two are told apart by whether anything was called at all.
 *
 * - `not-callable` — nothing was called. Not a function, or a class component.
 *   `failures` is empty because there is nothing to report.
 * - `threw` — it was called under every configuration and threw under all of
 *   them, and `failures` carries each one.
 *
 * A hook-using component lands in `threw` alongside a broken one, and no
 * function-call probe can separate them: both are functions, both throw, and the
 * error React raises for a hook outside a render is a message rather than a
 * type. So this does not say *which* fault it is. It says the probe got as far
 * as calling the component, which is the line a host can act on.
 */
export type NotProbeableCause = "not-callable" | "threw"

export type NotProbeable = {
  readonly outcome: "not-probeable"
  readonly cause: NotProbeableCause
  readonly reason: string
  /** Every configuration that threw. Empty exactly when nothing was called. */
  readonly failures: readonly ProbeFailure[]
}

const notCallable = (reason: string): NotProbeable => ({
  outcome: "not-probeable",
  cause: "not-callable",
  reason,
  failures: [],
})

/**
 * Named rather than counted. Whoever reads this has to reproduce it, and
 * `{"type":"select"}` is the whole reproduction.
 */
export const describeProbeFailures = (failures: readonly ProbeFailure[]): string =>
  failures
    .map((failure) => {
      const answering =
        failure.answered && failure.answered.length > 0
          ? ` answering ${failure.answered.join(", ")}`
          : ""

      return `${JSON.stringify(failure.props)}${answering} (${failure.reason})`
    })
    .join(", ")

const threwThroughout = (failures: readonly ProbeFailure[]): NotProbeable => ({
  outcome: "not-probeable",
  cause: "threw",
  reason:
    failures.length === 0
      ? "no configuration answered"
      : `threw under every configuration probed: ${describeProbeFailures(failures)}`,
  failures,
})

export type ConformanceVerdict =
  | { readonly outcome: "decorates" }
  | { readonly outcome: "not-decorated" }
  | NotProbeable

const PROBE_NODE_ID = nodeIdSchema.parse("n_probe")
const PROBE_TYPE = primitiveTypeSchema.parse("loom.probe")
const PROBE_CHILDREN = "loom-probe-children"

/**
 * A probe has no tree, so there is nothing for `loom.decorative()` to render
 * again; it answers with a marker instead.
 *
 * A *distinct* marker, deliberately. A primitive that placed only the
 * decorative copy would render its whole content unaddressable, and if the copy
 * answered with `PROBE_CHILDREN` the placement probe would call that primitive
 * one that renders its children.
 */
const PROBE_DECORATIVE = (): ReactNode => "loom-probe-decorative"

/**
 * A probe is handed the primitive's own declared strings rather than an empty
 * map. A component that reads `loom.text.excluded` and formats it would throw on
 * `undefined` and read as `not-probeable` — a false negative produced entirely
 * by the probe, for a primitive that is correct.
 */
const probeProps = (
  editable: EditableAttributes,
  text: PrimitiveText<string>,
  configuration: ProbeConfiguration,
  frames: NodeFrames = NO_FRAMES
): LoomPrimitiveProps => ({
  loom: {
    nodeId: PROBE_NODE_ID,
    type: PROBE_TYPE,
    editable,
    slots: NO_SLOTS,
    data: configuration.data,
    frames,
    text,
    behaviors: NO_BEHAVIORS,
    decorative: PROBE_DECORATIVE,
  },
  props: configuration.props,
  children: PROBE_CHILDREN,
})

/**
 * One call of the probe: the props the node carries, and the answers it had.
 *
 * The second half was `NO_DATA` for every probe in this module until 0185, and
 * that was not a default — it was the only state reachable. A primitive that
 * places a region only when a source failed placed it in no probe, so
 * `unplacedSlots` read that region as dropped content and 0180 wrote the
 * consequence down as a rule about what a bound primitive may declare. The
 * rule was the probe's limit wearing the library's clothes.
 */
export type ProbeConfiguration = {
  readonly props: JsonObject
  /** `NO_DATA` means *this node asked nothing*, which is most of them. */
  readonly data: NodeData
}

/** Props with nothing answered beside them, which is most configurations (0185). */
export const unasked = (props: JsonObject): ProbeConfiguration => ({ props, data: NO_DATA })

/**
 * An answer state a caller wants a primitive probed in, beside the states its
 * own schema closes over.
 *
 * Supplied rather than derived, for the reason the specimen's `endpoints` is:
 * the probe would have to invent a value, and an invented answer is either one
 * the primitive happens to be able to draw — in which case the probe is
 * measuring the guess — or one it cannot, in which case every bound primitive
 * reports its failure region as the only one it places. Whoever registered the
 * primitive knows what it reads; the probe does not.
 */
export type ProbeAnswers = {
  /** Answers by binding name, as the render walk would hand them over. */
  readonly data: NodeData
  /**
   * The props the node carries in this state. Absent means its defaults, which
   * is the configuration a binding name's default was chosen for (0184).
   */
  readonly props?: JsonObject
}

const namesIn = (data: NodeData): readonly string[] => {
  const names: string[] = []
  for (const name in data) names.push(name)

  return names.sort()
}

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

/**
 * The states a primitive is probed in: what its schema closes over, then what
 * its registrant declared it can be answered with (0185).
 *
 * Two functions rather than one, and the split is the argument. What a schema
 * closes over is **derived** — `probeConfigurations` reads it off the
 * registration and cannot be wrong about it. What a bound primitive can be
 * answered with is **supplied**, because nothing here knows it. Folding the
 * second into the first would put a caller's declaration and a machine's
 * enumeration behind one name, and the day they disagree is the day nobody can
 * tell which half was wrong.
 *
 * The answers are summed in rather than crossed with every prop value, for the
 * reason 0075 sums the choices, and it costs less here: what a bound primitive
 * draws turns on the *answer*, and the state a caller has to reach to find an
 * unplaced region is the answer under the props that name it — which is why an
 * answer carries its own optional props.
 */
export const probeStates = (
  configurations: readonly JsonObject[],
  answers: readonly ProbeAnswers[] = []
): readonly ProbeConfiguration[] => [
  ...configurations.map(unasked),
  ...answers.map((answer) => ({ props: answer.props ?? {}, data: answer.data })),
]

const DEFAULT_CONFIGURATIONS: readonly ProbeConfiguration[] = [unasked({})]

/**
 * A probe has no allowlist, so a declared framable prop is answered `allowed`
 * against an origin that does not exist.
 *
 * `allowed` rather than `refused`, deliberately, and it is the same choice
 * `PROBE_DECORATIVE` makes for the opposite reason. A primitive that declares a
 * frame renders a refusal when it is told no — that is the whole point of the
 * seam — and a probe that always said no would be probing every embed's error
 * state and calling it the primitive. The URL is a marker origin nobody can
 * register, so one that escapes into real markup is recognisable on sight
 * rather than being a plausible-looking video that silently never loads.
 */
const PROBE_FRAME_ORIGIN = frameOriginSchema.parse("https://probe.loom.invalid")

const probeFrames = (declared: readonly string[]): NodeFrames => {
  if (declared.length === 0) return NO_FRAMES

  const frames: Record<string, FrameOutcome> = Object.create(null) as Record<string, FrameOutcome>

  for (const prop of declared) {
    frames[prop] = {
      status: "allowed",
      url: `${PROBE_FRAME_ORIGIN}/${prop}`,
      origin: PROBE_FRAME_ORIGIN,
      sameOrigin: false,
    }
  }

  return Object.freeze(frames)
}

/** The marker handed to a declared slot, unique per name so a miss names itself. */
const slotMarker = (name: string): string => `loom-probe-slot:${name}`

/** The same, for a declared behavior's control. */
const behaviorMarker = (name: string): string => `loom-probe-behavior:${name}`

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
 * A probe calls a primitive rather than mounting one, and a class cannot be
 * called — see `asCallablePrimitive`, which decides that for both the callers
 * in this package that need it.
 */
type ProbeableComponent = CallablePrimitive

const asProbeable = asCallablePrimitive

/** Calls a probeable component, turning whatever it throws into a reason. */
const call = (probeable: ProbeableComponent, props: LoomPrimitiveProps): Result<ReactNode, string> => {
  try {
    return ok(probeable(props))
  } catch (thrown) {
    return err(thrown instanceof Error ? thrown.message : String(thrown))
  }
}

type ProbeAttempt = {
  readonly configuration: ProbeConfiguration
  readonly result: Result<ReactNode, string>
}

const failureOf = (configuration: ProbeConfiguration, reason: string): ProbeFailure => {
  const answered = namesIn(configuration.data)

  return answered.length === 0
    ? { props: configuration.props, reason }
    : { props: configuration.props, reason, answered }
}

const failuresIn = (attempts: readonly ProbeAttempt[]): readonly ProbeFailure[] =>
  attempts.flatMap((attempt) =>
    attempt.result.ok ? [] : [failureOf(attempt.configuration, attempt.result.error)]
  )

/**
 * Decoration is a promise that holds however the primitive is configured, so
 * one configuration that fails to decorate makes the answer `not-decorated`
 * even if the rest pass. A configuration that throws answers nothing either
 * way and is skipped; when none of them answer, every failure is carried on the
 * verdict, so the reason the probe declined is a value rather than the prose of
 * whichever configuration happened to be first.
 */
export const probeEditableDecoration = (
  primitive: LoomPrimitive,
  text: PrimitiveText<string> = NO_TEXT,
  configurations: readonly ProbeConfiguration[] = DEFAULT_CONFIGURATIONS,
  declaredFrames: readonly string[] = []
): ConformanceVerdict => {
  const probeable = asProbeable(primitive)
  if (!probeable.ok) return notCallable(probeable.error)

  const editable: EditableAttributes = {
    [LOOM_NODE_ATTRIBUTE]: PROBE_NODE_ID,
    [LOOM_TYPE_ATTRIBUTE]: PROBE_TYPE,
  }

  const attempts = configurations.map((configuration) => ({
    configuration,
    result: call(
      probeable.value,
      probeProps(editable, text, configuration, probeFrames(declaredFrames))
    ),
  }))
  const answered = attempts.flatMap((attempt) => (attempt.result.ok ? [attempt.result.value] : []))

  if (answered.length === 0) return threwThroughout(failuresIn(attempts))

  return answered.every((node) => carriesDecoration(node, editable))
    ? { outcome: "decorates" }
    : { outcome: "not-decorated" }
}

/**
 * The second probe: does a primitive place what it was handed?
 *
 * A declared behavior is a promise of the same kind and fails the same way. A
 * primitive that asks for the copy control and never reads
 * `loom.behaviors.copy` registers cleanly, renders correctly and simply has no
 * copy button — the gap the behavior was declared to close, still open, with
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

export type PlacementVerdict =
  | {
      readonly outcome: "probed"
      /** Declared slots that no probed configuration placed. */
      readonly unplacedSlots: readonly string[]
      /** Declared behaviors whose control no probed configuration placed. */
      readonly unplacedBehaviors: readonly BehaviorName[]
      /** Whether any probed configuration placed the children it was handed. */
      readonly rendersChildren: boolean
      /**
       * The configurations that answered — one unasked `{}` alone when the
       * schema closes over nothing and the caller supplied no answers.
       */
      readonly probed: readonly ProbeConfiguration[]
      /**
       * Configurations built from the primitive's own schema that it threw on.
       * Never a reason to distrust the verdict — the configurations that
       * answered still answered — and always a fault: a component that throws
       * on a value its schema accepts is one a valid tree can crash a page with.
       */
      readonly threw: readonly ProbeFailure[]
    }
  | NotProbeable

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
  configurations: readonly ProbeConfiguration[] = DEFAULT_CONFIGURATIONS,
  declaredBehaviors: readonly BehaviorName[] = [],
  declaredFrames: readonly string[] = []
): PlacementVerdict => {
  const probeable = asProbeable(primitive)
  if (!probeable.ok) return notCallable(probeable.error)

  const slots: Record<string, ReactNode> = Object.create(null) as Record<string, ReactNode>
  for (const name of declaredSlots) slots[name] = slotMarker(name)

  const behaviors: Record<string, ReactNode> = Object.create(null) as Record<string, ReactNode>
  for (const name of declaredBehaviors) behaviors[name] = behaviorMarker(name)

  const attempts = configurations.map((configuration) => ({
    configuration,
    result: call(probeable.value, {
      loom: {
        nodeId: PROBE_NODE_ID,
        type: PROBE_TYPE,
        slots,
        data: configuration.data,
        frames: probeFrames(declaredFrames),
        text,
        behaviors: behaviors as PrimitiveBehaviors<BehaviorName>,
        decorative: PROBE_DECORATIVE,
      },
      props: configuration.props,
      children: PROBE_CHILDREN,
    }),
  }))

  const answered = attempts.flatMap((attempt) => (attempt.result.ok ? [attempt] : []))

  if (answered.length === 0) return threwThroughout(failuresIn(attempts))

  const placed = (marker: string): boolean =>
    answered.some((attempt) => attempt.result.ok && containsMarker(attempt.result.value, marker))

  return {
    outcome: "probed",
    unplacedSlots: declaredSlots.filter((name) => !placed(slotMarker(name))),
    unplacedBehaviors: declaredBehaviors.filter((name) => !placed(behaviorMarker(name))),
    rendersChildren: placed(PROBE_CHILDREN),
    probed: answered.map((attempt) => attempt.configuration),
    threw: failuresIn(attempts),
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
  | NotProbeable

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
  configurations: readonly ProbeConfiguration[] = DEFAULT_CONFIGURATIONS,
  declaredFrames: readonly string[] = []
): SubmissionVerdict => {
  const probeable = asProbeable(primitive)
  if (!probeable.ok) return notCallable(probeable.error)

  const attempts = configurations.map((configuration) => ({
    configuration,
    result: call(probeable.value, {
      loom: {
        nodeId: PROBE_NODE_ID,
        type: PROBE_TYPE,
        slots: NO_SLOTS,
        data: configuration.data,
        frames: probeFrames(declaredFrames),
        text,
        behaviors: NO_BEHAVIORS,
        submit: PROBE_SUBMISSION,
        decorative: PROBE_DECORATIVE,
      },
      props: configuration.props,
      children: PROBE_CHILDREN,
    }),
  }))

  const answered = attempts.flatMap((attempt) => (attempt.result.ok ? [attempt.result.value] : []))

  if (answered.length === 0) return threwThroughout(failuresIn(attempts))

  return answered.some((node) => containsMarker(node, PROBE_SUBMIT_ACTION))
    ? { outcome: "places" }
    : { outcome: "not-placed" }
}

/**
 * The fourth probe: which colors does this primitive put on which grounds?
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
 * ## A ground is not always an ancestor
 *
 * CSS inherits `color` down the tree and paints a background on whatever box
 * is behind the glyphs, and those two are not the same walk. A run of text sits
 * on the ground of the nearest box *behind* it, which is an ancestor only when
 * nothing is stacked in between.
 *
 * `loom.overlay` is the case that proves it. It sets `fg-default` on its root
 * and paints nothing there; a scrim child paints `bg-overlay` in grid cell
 * `1 / 1` at `zIndex: 1`; the content sits in the same cell at `zIndex: 2` and
 * sets no color of its own. Every word of it renders in `fg-default` on
 * `bg-overlay` — and read as an ancestor chain the two ends never meet, so the
 * pairing was invisible here from the day the primitive shipped.
 *
 * So two things travel down: the ground in effect **and the ink in effect**,
 * and a pairing is recorded wherever either changes under the other. Siblings
 * that declare the same `gridArea` are one stack ordered by `zIndex`, and an
 * element's ground is the nearest member below it that paints one.
 *
 * ## What it does not see
 *
 * Only `children` is walked, matching `carriesDecoration`, so an element handed
 * to another component through a prop of the primitive's own naming is not
 * followed. Only `background`, `backgroundColor` and `color` are read, and only
 * where the value is exactly the `var(--loom-…)` form `color()` produces — a
 * primitive that composes a gradient or interpolates a variable into a longhand
 * answers nothing rather than a guess, for the reason `contrastRatio` declines
 * a color it would have to parse.
 *
 * **Stacking is read from `gridArea` and from nothing else.** An absolutely
 * positioned sibling also lies under its neighbours, and whether it lies under
 * *all* of them is a question about an arbitrary length expression —
 * `inset: calc(-1 * 4px)` is `loom.halo`'s, and no reading of that string says
 * what it covers. A grid area is a name two elements either share or do not.
 * Neither `loom.halo` nor `loom.backdrop` paints a palette slot under its
 * content today (both draw gradients, which `slotOf` declines), so the narrow
 * rule costs nothing real and the wide one would have been a guess.
 */

export type ColorPairing = {
  readonly foreground: PaletteSlot
  readonly background: PaletteSlot
}

export type ColorVerdict =
  | {
      readonly outcome: "probed"
      /** Ink and ground both set by this primitive. */
      readonly painted: readonly ColorPairing[]
      /** Ink set here, ground left to whatever this is placed in. */
      readonly floating: readonly PaletteSlot[]
      /** Grounds this primitive puts its declared children and slots on. */
      readonly childGrounds: readonly PaletteSlot[]
    }
  | NotProbeable

/** `color()` emits `var(--loom-<slot>)` and nothing else does. */
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
  readonly painted: ColorPairing[]
  readonly floating: PaletteSlot[]
  readonly childGrounds: PaletteSlot[]
}

/** What CSS has in effect at a point in the tree — both halves of a pairing. */
type Effective = {
  readonly ground: PaletteSlot | undefined
  readonly ink: PaletteSlot | undefined
}

const NOTHING_IN_EFFECT: Effective = { ground: undefined, ink: undefined }

const styleOf = (node: ReactElement): Readonly<Record<string, unknown>> | undefined => {
  const style = (node.props as Readonly<Record<string, unknown>>)["style"]

  return typeof style === "object" && style !== null ? (style as Readonly<Record<string, unknown>>) : undefined
}

/**
 * React hands children as arbitrarily nested arrays; a stack is over one list of
 * them. `null`, `undefined` and a boolean render nothing at all, and an element
 * whose children are only those is as empty as one with none — which is the
 * difference between a panel and a painted dot, so they are dropped here rather
 * than counted.
 */
const flatten = (node: ReactNode): readonly ReactNode[] =>
  Array.isArray(node)
    ? (node as readonly ReactNode[]).flatMap(flatten)
    : node === null || node === undefined || typeof node === "boolean" || node === ""
      ? []
      : [node]

const gridAreaOf = (style: Readonly<Record<string, unknown>> | undefined): string | undefined => {
  const area = style?.["gridArea"]

  return typeof area === "string" ? area : undefined
}

/**
 * `z-index: auto` and `z-index: 0` paint in the same order as each other, and
 * source order breaks the tie in both cases — which is what the fallback to the
 * element's position in the list is.
 *
 * React takes the property as a number or as a string, and `"2"` is the same
 * layer as `2`; anything else is `auto` by another name.
 */
const depthOf = (style: Readonly<Record<string, unknown>> | undefined): number => {
  const depth = style?.["zIndex"]

  if (typeof depth === "number") return depth
  if (typeof depth !== "string") return 0

  const parsed = Number(depth.trim())

  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * For each sibling that shares a grid cell with another, the ground painted by
 * the nearest one stacked beneath it.
 *
 * *Nearest* rather than *any*: a scrim over a photograph over a card is three
 * layers, and what the words on top actually sit on is the scrim. Taking the
 * bottom of the stack would name a ground the reader never sees through.
 */
const stackedGrounds = (siblings: readonly ReactNode[]): ReadonlyMap<ReactNode, PaletteSlot> => {
  const members = siblings.flatMap((node, order) => {
    if (!isValidElement(node)) return []

    const style = styleOf(node)
    const area = gridAreaOf(style)

    return area === undefined
      ? []
      : [{ node: node as ReactNode, area, order, depth: depthOf(style), ground: style === undefined ? undefined : groundOf(style) }]
  })

  const under = new Map<ReactNode, PaletteSlot>()

  for (const cell of new Set(members.map((member) => member.area))) {
    const stack = members
      .filter((member) => member.area === cell)
      .sort((a, b) => a.depth - b.depth || a.order - b.order)

    for (const [index, member] of stack.entries()) {
      for (let below = index - 1; below >= 0; below -= 1) {
        const ground = stack[below]?.ground

        if (ground !== undefined) {
          under.set(member.node, ground)
          break
        }
      }
    }
  }

  return under
}

const collectPaint = (
  node: ReactNode,
  effective: Effective,
  stacked: PaletteSlot | undefined,
  markers: ReadonlySet<string>,
  into: Paint
): void => {
  if (typeof node === "string") {
    if (markers.has(node) && effective.ground !== undefined) into.childGrounds.push(effective.ground)

    return
  }

  if (!isValidElement(node)) return

  const own = styleOf(node)
  const painted = own === undefined ? undefined : groundOf(own)
  const declared = own === undefined ? undefined : slotOf(own["color"])

  const ground = painted ?? stacked ?? effective.ground
  const ink = declared ?? effective.ink

  const children = flatten((node.props as Readonly<Record<string, unknown>>)["children"] as ReactNode)

  /**
   * Either half arriving under the other makes the pair, which is why an ink
   * declared here and a ground introduced here are both triggers. An element
   * that changes neither repeats its parent's pairing and is not recorded
   * again.
   *
   * **A ground only answers for an inherited ink if something can be written on
   * it.** `loom.frame` draws its camera notch as an empty `span` filled with
   * `fg-default`, and `loom.message` its typing dots with `fg-muted`: an ink
   * slot used as a shape, inside a card that set `fg-default` above it. Counting
   * those gave `fg-muted on fg-muted` — 1.00:1 in every palette ever written,
   * for a pair no reader will ever meet, which is precisely the row
   * `PALETTE_TEXT_PAIRINGS` refuses to carry. An element with no children is a
   * shape and not a surface. An ink *declared* here is recorded either way,
   * because that is the claim the component itself made.
   */
  const surface = declared !== undefined || children.length > 0

  if (ink !== undefined && ground !== undefined && surface && (declared !== undefined || ground !== effective.ground)) {
    into.painted.push({ foreground: ink, background: ground })
  }

  if (declared !== undefined && ground === undefined) into.floating.push(declared)

  collectChildren(children, { ground, ink }, markers, into)
}

const collectChildren = (
  siblings: readonly ReactNode[],
  effective: Effective,
  markers: ReadonlySet<string>,
  into: Paint
): void => {
  const under = stackedGrounds(siblings)

  for (const child of siblings) collectPaint(child, effective, under.get(child), markers, into)
}

const uniqueSlots = (slots: readonly PaletteSlot[]): readonly PaletteSlot[] => [...new Set(slots)].sort()

const uniquePairings = (pairings: readonly ColorPairing[]): readonly ColorPairing[] =>
  [...new Map(pairings.map((pairing) => [`${pairing.foreground}|${pairing.background}`, pairing])).values()].sort(
    (a, b) => `${a.foreground}|${a.background}`.localeCompare(`${b.foreground}|${b.background}`)
  )

/**
 * The union across every configuration, rather than the intersection the
 * decoration probe takes. Decoration is a promise that has to hold however the
 * primitive is configured; a color pairing is a fact about one configuration,
 * and a `loom.section` that paints `accent-subtle` only under `tone: "accent"`
 * renders that pairing on a real page whatever the other tones do.
 */
export const probeColorPairings = (
  primitive: LoomPrimitive,
  declaredSlots: readonly string[] = [],
  text: PrimitiveText<string> = NO_TEXT,
  configurations: readonly ProbeConfiguration[] = DEFAULT_CONFIGURATIONS,
  declaredFrames: readonly string[] = []
): ColorVerdict => {
  const probeable = asProbeable(primitive)
  if (!probeable.ok) return notCallable(probeable.error)

  const slots: Record<string, ReactNode> = Object.create(null) as Record<string, ReactNode>
  for (const name of declaredSlots) slots[name] = slotMarker(name)

  const markers = new Set<string>([PROBE_CHILDREN, ...declaredSlots.map(slotMarker)])

  const attempts = configurations.map((configuration) => ({
    configuration,
    result: call(probeable.value, {
      loom: {
        nodeId: PROBE_NODE_ID,
        type: PROBE_TYPE,
        slots,
        data: configuration.data,
        frames: probeFrames(declaredFrames),
        text,
        behaviors: NO_BEHAVIORS,
        decorative: PROBE_DECORATIVE,
      },
      props: configuration.props,
      children: PROBE_CHILDREN,
    }),
  }))

  const answered = attempts.flatMap((attempt) => (attempt.result.ok ? [attempt.result.value] : []))

  if (answered.length === 0) return threwThroughout(failuresIn(attempts))

  const into: Paint = { painted: [], floating: [], childGrounds: [] }
  for (const node of answered) collectChildren(flatten(node), NOTHING_IN_EFFECT, markers, into)

  return {
    outcome: "probed",
    painted: uniquePairings(into.painted),
    floating: uniqueSlots(into.floating),
    childGrounds: uniqueSlots(into.childGrounds),
  }
}
