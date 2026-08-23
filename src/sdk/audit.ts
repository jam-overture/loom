import type { DecorationLookup } from "../render/addressing.js"
import type { PrimitiveType } from "../primitive-type.js"

import {
  probeConfigurations,
  probeEditableDecoration,
  probeSlotPlacement,
  probeSubmissionPlacement,
  type ConformanceVerdict,
  type PlacementVerdict,
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
}

/** A primitive that declared a region and then did not render it. */
export type UnplacedSlots = {
  readonly type: PrimitiveType
  readonly slots: readonly string[]
}

/** A primitive that threw under some configuration its own schema accepts. */
export type ThrowingConfigurations = {
  readonly type: PrimitiveType
  readonly failures: readonly ProbeFailure[]
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
}

const unplacedIn = (placement: PlacementVerdict): readonly string[] =>
  placement.outcome === "probed" ? placement.unplacedSlots : []

const threwIn = (placement: PlacementVerdict): readonly ProbeFailure[] =>
  placement.outcome === "probed" ? placement.threw : []

export const auditRegistry = (registry: PrimitiveRegistry): RegistryAudit => {
  const audits = registry.primitives.map((primitive) => {
    const configurations = probeConfigurations(primitive.choices)

    return {
      type: primitive.type,
      verdict: probeEditableDecoration(primitive.component, primitive.text, configurations),
      placement: probeSlotPlacement(primitive.component, primitive.slots, primitive.text, configurations),
      submission: probeSubmissionPlacement(primitive.component, primitive.text, configurations),
      declaresSubmits: primitive.submits,
    }
  })

  const places = (audit: PrimitiveAudit): boolean => audit.submission.outcome === "places"

  return {
    audits,
    submits: audits.filter(places).map((audit) => audit.type),
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
    leaves: audits
      .filter((audit) => audit.placement.outcome === "probed" && !audit.placement.rendersChildren)
      .map((audit) => audit.type),
    throwsOnDeclaredProps: audits
      .filter((audit) => threwIn(audit.placement).length > 0)
      .map((audit) => ({ type: audit.type, failures: threwIn(audit.placement) })),
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

  const under =
    placement.probed.length === 1 ? "" : ` under all ${placement.probed.length} configurations probed`
  const children = placement.rendersChildren
    ? "renders its children"
    : `renders no children (a leaf)${under}`

  if (placement.threw.length === 0) return children

  /**
   * Named rather than counted. A person reading this has to reproduce it, and
   * `{"type":"select"}` is the whole reproduction.
   */
  const threw = placement.threw
    .map((failure) => `${JSON.stringify(failure.props)} (${failure.reason})`)
    .join(", ")

  return `${children}; threw on ${threw}`
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

/** One line per primitive, for a CLI or a failing test's message. */
export const describeRegistryAudit = (audit: RegistryAudit): string =>
  audit.audits
    .map(
      (entry) =>
        `${entry.type}: ${describeVerdict(entry.verdict)}; ${describePlacement(entry.placement)}${describeSubmission(entry)}`
    )
    .join("\n")
