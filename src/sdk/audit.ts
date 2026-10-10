import type { DecorationLookup } from "../render/addressing.js"
import type { BindingName } from "../data/source.js"
import type { PrimitiveType } from "../primitive-type.js"

import type { BehaviourName } from "../render/behaviour.js"
import { namesRead, type BindingDeclaration } from "../render/reads.js"

import {
  describeProbeFailures,
  probeConfigurations,
  probeEditableDecoration,
  probePlacement,
  probeStates,
  probeSubmissionPlacement,
  type ConformanceVerdict,
  type PlacementVerdict,
  type ProbeAnswers,
  type ProbeFailure,
  type SubmissionVerdict,
} from "./conformance.js"
import type { PrimitiveRegistry } from "./registry.js"

/**
 * The registration-time check, as a function a host calls rather than a side
 * effect of building a registry (0010).
 *
 * The split matters. Probing calls every registered component once, and calling
 * arbitrary components while a module graph is still evaluating is not something
 * a library should do behind a host's back. So `createPrimitiveRegistry` stays
 * pure and this runs where such things belong — in a test, or a build step, where
 * a failure stops a release rather than a request.
 *
 * The audit reports; it does not decide. A primitive that ignores
 * `loom.editable` renders correctly and is only invisible to the portal, so
 * whether that blocks a deployment depends on whether the deployment has a
 * portal. `notDecorated` is there to be asserted empty by a host that cares.
 *
 * Every probe runs under every configuration the primitive's schema closes over
 * (0075) rather than under no props at all, because a primitive whose rendering
 * turns on a prop — `loom.field` places children only when its `type` is
 * `select` — was reported by the shape it takes at its default, which is a
 * claim about one configuration wearing the name of the primitive.
 */

export type PrimitiveAudit = {
  readonly type: PrimitiveType
  readonly verdict: ConformanceVerdict
  readonly placement: PlacementVerdict
  readonly submission: SubmissionVerdict
  /** What the author declared, beside what the probe saw. */
  readonly declaresSubmits: boolean
  /** The props this primitive declared it frames (0095). Empty for almost all. */
  readonly framesProps: readonly string[]
}

/** A primitive that declared a region and then did not render it. */
export type UnplacedSlots = {
  readonly type: PrimitiveType
  readonly slots: readonly string[]
}

/** A primitive that took a control from the runtime and then did not place it. */
export type UnplacedBehaviours = {
  readonly type: PrimitiveType
  readonly behaviours: readonly BehaviourName[]
}

/**
 * Why a bound primitive was never probed in a state where it had an answer.
 *
 * Two causes, one list, because what a reader of this does about either is the
 * same — hand `auditRegistry` an answer for that type — and because the second
 * is reachable only by trying the first. A host that satisfies `notAnswered` by
 * handing an answer keyed under a name the primitive does not read would, with
 * only the first cause reported, get an empty list and the same wrong picture it
 * started with.
 */
export type UnansweredReason =
  /** The audit was handed no answers for this type at all. */
  | "no-answers"
  /**
   * It was handed some, and no state carried a name this primitive resolves to.
   *
   * *No* state rather than *some* state: a primitive reading two bindings and
   * answered on one has been seen answered, and reporting it would make the list
   * one a host cannot assert empty. This is the total miss only.
   */
  | "names-not-answered"

/**
 * A bound primitive the audit was not put in a position to see answered.
 *
 * The one entry here that is a fact about the **call** rather than about the
 * component. Everything else this audit reports is something a probe observed;
 * this says the probe was never told what it needed, which is why it is reported
 * at all — a primitive that declares a region it places only for an answer reads
 * as having dropped that region, and nothing in the output says the reader is
 * looking at the audit's own blind spot rather than at a defect.
 *
 * 0185 gave the probe the seam and the permission that followed it sat for
 * sixteen days with no caller, because a permission is the one kind of change no
 * suite notices. This is the half that would have said so on the day.
 */
export type UnansweredReader = {
  readonly type: PrimitiveType
  /**
   * What its registrant declared it reads, unchanged — either of the two forms
   * a declaration may take (0184).
   */
  readonly reads: readonly BindingDeclaration<BindingName>[]
  readonly reason: UnansweredReason
}

/** A primitive that threw under some configuration its own schema accepts. */
export type ThrowingConfigurations = {
  readonly type: PrimitiveType
  readonly failures: readonly ProbeFailure[]
  /**
   * Whether *nothing* the probe tried came back — the line between a fault the
   * audit is certain of and one it is only reporting.
   *
   * `false`: some configurations rendered and this one threw, so the component
   * is callable and a value its own schema accepts crashes it. Certain.
   *
   * `true`: every configuration threw, which is what a broken component and a
   * hook-using one both look like from outside a renderer — and a hook-using
   * component is a legitimate primitive (0012). A host with none of those
   * asserts the whole list empty; one that ships them asserts the `false` half
   * and reads the rest.
   */
  readonly everyConfiguration: boolean
}

export type RegistryAudit = {
  readonly audits: readonly PrimitiveAudit[]
  /** Registered, renders, invisible to the portal. */
  readonly notDecorated: readonly PrimitiveType[]
  /** The probe could not answer — neither a pass nor a failure. */
  readonly notProbeable: readonly PrimitiveType[]
  /**
   * Declared a slot and dropped it. Unlike `notDecorated` this loses content
   * rather than a handle, so a host with no portal at all still wants it empty.
   */
  readonly unplacedSlots: readonly UnplacedSlots[]
  /**
   * Declared a behaviour and dropped its control. Like `unplacedSlots` this is
   * a promise the registration made and the component did not keep — and unlike
   * a slot, nothing else on the page hints that something is missing, because
   * the content a behaviour acts on renders perfectly without it.
   */
  readonly unplacedBehaviours: readonly UnplacedBehaviours[]
  /**
   * Declared it reads a binding and was never probed in a state that answered
   * one. Reported rather than failed, like `notDecorated` and for the same
   * reason: whether it matters depends on the deployment (0012). A host
   * auditing the library it ships asserts it empty, because an entry here means
   * every other list on this audit is describing that primitive's unanswered
   * branch and calling it the primitive.
   *
   * Unlike every other list, an entry is not a claim about the component. It is
   * a claim about this call.
   */
  readonly notAnswered: readonly UnansweredReader[]
  /**
   * Renders no children — a leaf. Not a fault: `loom.stat` holds its value and
   * label as props and has nowhere to put a text node. It is here because it is
   * the one fact the renderer cannot derive, and a portal that offers "insert
   * into this node" needs it to avoid offering a place nothing will appear.
   */
  readonly leaves: readonly PrimitiveType[]
  /**
   * Threw on props built from its own schema. A fault whoever registered it
   * wants to know about — a tree the validator accepts can take the page down —
   * and never a reason to distrust the rest of this audit, which is answered by
   * the configurations that did render.
   *
   * Every primitive that threw is here, including one that threw under *all* of
   * them. That case used to reach only `notProbeable`, beside the class and
   * hook-using components that are legitimate primitives (0012), so the most
   * extreme instance of the fault this list exists for sat in the one list a
   * host cannot assert empty. `everyConfiguration` marks it rather than hiding
   * it.
   */
  readonly throwsOnDeclaredProps: readonly ThrowingConfigurations[]
  /**
   * The registered primitives that post, as the probe observed them.
   *
   * This is the list a deployment holds its endpoint registry against: if
   * anything here is registered, `renderRequest` wants `endpoints`, and a
   * deployment that ships one without the other ships forms that render
   * disabled. Derived rather than declared, so it is the truth about the
   * components rather than the sum of their authors' intentions.
   */
  readonly submits: readonly PrimitiveType[]
  /**
   * Places an address and never declared it posts. Not a broken page — the
   * form works — but the declaration is what a deployment reads to know the
   * seam is load-bearing here, so an undeclared submitter is a form whose need
   * for an endpoint registry is invisible until someone fills it in.
   */
  readonly undeclaredSubmitters: readonly PrimitiveType[]
  /**
   * Declared it posts and placed no address under any configuration probed.
   * This is the failure the submission seam exists to prevent, caught one layer
   * earlier than it would otherwise be: a submit control that goes nowhere
   * renders, looks finished, and reports nothing until a visitor uses it.
   */
  readonly unwiredSubmitters: readonly PrimitiveType[]
  /**
   * The registered primitives that put a prop in a frame.
   *
   * This is the list a deployment holds its framable-origin registry against,
   * exactly as `submits` is held against its endpoint registry: if anything
   * here is registered, `renderRequest` wants `origins`, and a deployment that
   * ships one without the other ships embeds that render a refusal.
   *
   * Declared rather than probed, which is the one place this audit takes an
   * author's word for something it could in principle check. It could not
   * check this one usefully: the seam already refuses to register a `frames`
   * naming a prop the schema does not declare, and the failure left over — a
   * primitive that puts a URL in an `iframe` and never said so — is invisible
   * to a probe, because an `iframe` a primitive built out of a prop it did not
   * declare looks exactly like one it did. What would catch that is a lint over
   * the markup, not a call of the component. Named here rather than left as a
   * gap somebody discovers.
   */
  readonly frames: readonly PrimitiveType[]
}

const unplacedIn = (placement: PlacementVerdict): readonly string[] =>
  placement.outcome === "probed" ? placement.unplacedSlots : []

const unplacedBehavioursIn = (placement: PlacementVerdict): readonly BehaviourName[] =>
  placement.outcome === "probed" ? placement.unplacedBehaviours : []

/**
 * The throwing configurations a placement verdict saw, from whichever branch it
 * came back on. A verdict that declined because *everything* threw holds the
 * same failures as one that answered despite some of them; only `not-callable`
 * has none, because nothing was called.
 */
const throwingIn = (type: PrimitiveType, placement: PlacementVerdict): readonly ThrowingConfigurations[] => {
  const failures = placement.outcome === "probed" ? placement.threw : placement.failures

  if (failures.length === 0) return []

  return [{ type, failures, everyConfiguration: placement.outcome === "not-probeable" }]
}

/**
 * What the audit is told beyond the registry itself.
 *
 * One field, and it exists because a probe that can only ask a primitive
 * questions about its props cannot see a bound one at all (0185). `loom.feed`
 * draws rows, an empty region, and a line for a source that did not answer;
 * probed with no answers it draws the third of those under every configuration
 * its schema closes over, so a region it places only for the first two reads as
 * a region nothing places.
 *
 * Keyed by primitive type, and absent for a primitive that reads no binding —
 * which is ninety-six of the ninety-eight registered today, and every one of
 * them audits exactly as it did before this field existed.
 */
export type RegistryAuditOptions = {
  /**
   * The answer states each type is probed in, beside the ones its own schema
   * closes over.
   *
   * A `Map` rather than an object, because the key is a primitive type and a
   * caller building one from `registry.primitives` has the branded strings
   * already — and because a lookup on an object literal is a lookup on
   * `Object.prototype` for any name that happens to be on it.
   */
  readonly answers?: ReadonlyMap<PrimitiveType, readonly ProbeAnswers[]>
}

const NO_ANSWERS: readonly ProbeAnswers[] = Object.freeze([])

/**
 * Whether one probed state answers something this primitive will look for.
 *
 * `Object.hasOwn` rather than a truthiness test on the read, because a name
 * answered with a failure is still a name answered: the state reaches the
 * primitive's did-not-answer branch *having been asked*, which is a state the
 * probe was told about and is not what this list reports.
 */
const answersAName = (
  answer: ProbeAnswers,
  reads: readonly BindingDeclaration<BindingName>[]
): boolean =>
  namesRead(reads, answer.props ?? {}).some((name) => Object.hasOwn(answer.data, name))

/**
 * One registration and the answers this call held for it, as nought or one entry.
 *
 * Derived from the registration and the options alone — no probe outcome reaches
 * here — because the claim is that the audit was not told something, and a probe
 * result cannot make that true or false.
 *
 * An empty `reads` is not a bound primitive and reports nothing, the way an
 * empty `frames` does: there is no answer anybody could have handed it.
 */
const unansweredReader = (
  type: PrimitiveType,
  reads: readonly BindingDeclaration<BindingName>[] | undefined,
  answers: readonly ProbeAnswers[]
): readonly UnansweredReader[] => {
  if (reads === undefined || reads.length === 0) return []
  if (answers.length === 0) return [{ type, reads, reason: "no-answers" }]
  if (answers.some((answer) => answersAName(answer, reads))) return []

  return [{ type, reads, reason: "names-not-answered" }]
}

export const auditRegistry = (
  registry: PrimitiveRegistry,
  options: RegistryAuditOptions = {}
): RegistryAudit => {
  const audits = registry.primitives.map((primitive) => {
    const configurations = probeStates(
      probeConfigurations(primitive.choices),
      options.answers?.get(primitive.type) ?? NO_ANSWERS
    )

    return {
      type: primitive.type,
      verdict: probeEditableDecoration(
        primitive.component,
        primitive.text,
        configurations,
        primitive.frames
      ),
      placement: probePlacement(
        primitive.component,
        primitive.slots,
        primitive.text,
        configurations,
        primitive.behaviours,
        primitive.frames
      ),
      submission: probeSubmissionPlacement(
        primitive.component,
        primitive.text,
        configurations,
        primitive.frames
      ),
      declaresSubmits: primitive.submits,
      framesProps: primitive.frames,
    }
  })

  const places = (audit: PrimitiveAudit): boolean => audit.submission.outcome === "places"

  return {
    audits,
    submits: audits.filter(places).map((audit) => audit.type),
    frames: audits.filter((audit) => audit.framesProps.length > 0).map((audit) => audit.type),
    undeclaredSubmitters: audits
      .filter((audit) => places(audit) && !audit.declaresSubmits)
      .map((audit) => audit.type),
    /**
     * `not-probeable` is not counted as unwired, for the reason
     * `decorationFromAudit` gives: the probe said it could not answer, which is
     * not the same as answering no, and a claim of a broken form is not one to
     * make on silence.
     */
    unwiredSubmitters: audits
      .filter((audit) => audit.declaresSubmits && audit.submission.outcome === "not-placed")
      .map((audit) => audit.type),
    notDecorated: audits.filter((audit) => audit.verdict.outcome === "not-decorated").map((audit) => audit.type),
    notProbeable: audits.filter((audit) => audit.verdict.outcome === "not-probeable").map((audit) => audit.type),
    unplacedSlots: audits
      .filter((audit) => unplacedIn(audit.placement).length > 0)
      .map((audit) => ({ type: audit.type, slots: unplacedIn(audit.placement) })),
    unplacedBehaviours: audits
      .filter((audit) => unplacedBehavioursIn(audit.placement).length > 0)
      .map((audit) => ({ type: audit.type, behaviours: unplacedBehavioursIn(audit.placement) })),
    notAnswered: registry.primitives.flatMap((primitive) =>
      unansweredReader(primitive.type, primitive.reads, options.answers?.get(primitive.type) ?? NO_ANSWERS)
    ),
    leaves: audits
      .filter((audit) => audit.placement.outcome === "probed" && !audit.placement.rendersChildren)
      .map((audit) => audit.type),
    throwsOnDeclaredProps: audits.flatMap((audit) => throwingIn(audit.type, audit.placement)),
  }
}

/**
 * The audit, as the predicate `addressNode` needs.
 *
 * Two judgement calls, both erring the same way — towards claiming a node is
 * addressable — because the DOM is the final authority and a portal that queries
 * for a handle can degrade when it misses. Refusing to point at a node that is in
 * fact there would be the worse failure: it is silent, and it makes a working
 * primitive look broken.
 *
 * - `not-probeable` counts as decorating. The probe said it could not answer,
 *   which is not the same as answering no.
 * - a type absent from the audit counts as *not* decorating, and that is not
 *   erring the other way: an unregistered type renders as nothing at all, so its
 *   whole subtree is missing from the DOM and delegating to an ancestor is
 *   exactly right.
 */
export const decorationFromAudit = (audit: RegistryAudit): DecorationLookup => {
  const verdicts = new Map(audit.audits.map((entry) => [entry.type, entry.verdict.outcome]))

  return (type: PrimitiveType) => {
    const outcome = verdicts.get(type)

    return outcome !== undefined && outcome !== "not-decorated"
  }
}

const describeVerdict = (verdict: ConformanceVerdict): string => {
  switch (verdict.outcome) {
    case "decorates":
      return "spreads loom.editable"
    case "not-decorated":
      return "does not spread loom.editable — it will be invisible to the portal"
    case "not-probeable":
      return `could not be probed (${verdict.reason})`
  }
}

const describePlacement = (placement: PlacementVerdict): string => {
  if (placement.outcome === "not-probeable") return `placement not probed (${placement.reason})`
  if (placement.unplacedSlots.length > 0) {
    return `declares ${placement.unplacedSlots.join(", ")} and does not place ${placement.unplacedSlots.length === 1 ? "it" : "them"}`
  }

  if (placement.unplacedBehaviours.length > 0) {
    return `takes the ${placement.unplacedBehaviours.join(", ")} behaviour and does not place ${placement.unplacedBehaviours.length === 1 ? "its control" : "their controls"}`
  }

  const under =
    placement.probed.length === 1 ? "" : ` under all ${placement.probed.length} configurations probed`
  const children = placement.rendersChildren
    ? "renders its children"
    : `renders no children (a leaf)${under}`

  if (placement.threw.length === 0) return children

  return `${children}; threw on ${describeProbeFailures(placement.threw)}`
}

/**
 * Said only when there is something to say. Every primitive decorates and every
 * primitive places or does not, so those two are worth a clause each on every
 * line; posting is the exception, and a clause reading "does not post" on fifty
 * lines would bury the one line that matters.
 */
const describeSubmission = (entry: PrimitiveAudit): string => {
  if (entry.submission.outcome === "not-probeable") return ""
  if (entry.submission.outcome === "places") {
    return entry.declaresSubmits ? "; posts" : "; posts, and does not declare `submits`"
  }

  return entry.declaresSubmits ? "; declares `submits` and places no address" : ""
}

const describeDeclaration = (declaration: BindingDeclaration): string =>
  typeof declaration === "string"
    ? `\`${declaration}\``
    : `whatever its \`${declaration.fromProp}\` prop says, or \`${declaration.default}\` where it says nothing`

/**
 * Said only when there is something to say, like `describeSubmission`, and said
 * last because it is the one clause that is not an observation. The clauses
 * before it may be describing this primitive's unanswered branch, and a reader
 * fixing something needs to know that before believing them.
 */
const describeAnswers = (unanswered: UnansweredReader | undefined): string => {
  if (unanswered === undefined) return ""

  const reads = unanswered.reads.map(describeDeclaration).join(", ")
  const cause =
    unanswered.reason === "no-answers"
      ? "was probed with no answer"
      : "was handed no answer under a name it reads"

  return `; reads ${reads} and ${cause}, so what it draws only when answered was never probed`
}

/** One line per primitive, for a CLI or a failing test's message. */
export const describeRegistryAudit = (audit: RegistryAudit): string => {
  const unanswered = new Map(audit.notAnswered.map((entry) => [entry.type, entry]))

  return audit.audits
    .map(
      (entry) =>
        `${entry.type}: ${describeVerdict(entry.verdict)}; ${describePlacement(entry.placement)}${describeSubmission(entry)}${describeAnswers(unanswered.get(entry.type))}`
    )
    .join("\n")
}
