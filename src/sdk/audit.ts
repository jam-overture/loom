import type { DecorationLookup } from "../render/addressing.js"
import type { PrimitiveType } from "../primitive-type.js"

import type { BehaviourName } from "../render/behaviour.js"

import {
  probeConfigurations,
  probeEditableDecoration,
  probePlacement,
  type ConformanceVerdict,
  type PlacementVerdict,
  type ProbeFailure,
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
   * Declared a behaviour and dropped its control. Like `unplacedSlots` this is
   * a promise the registration made and the component did not keep — and unlike
   * a slot, nothing else on the page hints that something is missing, because
   * the content a behaviour acts on renders perfectly without it.
   */
  readonly unplacedBehaviours: readonly UnplacedBehaviours[]
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
}

const unplacedIn = (placement: PlacementVerdict): readonly string[] =>
  placement.outcome === "probed" ? placement.unplacedSlots : []

const unplacedBehavioursIn = (placement: PlacementVerdict): readonly BehaviourName[] =>
  placement.outcome === "probed" ? placement.unplacedBehaviours : []

const threwIn = (placement: PlacementVerdict): readonly ProbeFailure[] =>
  placement.outcome === "probed" ? placement.threw : []

export const auditRegistry = (registry: PrimitiveRegistry): RegistryAudit => {
  const audits = registry.primitives.map((primitive) => {
    const configurations = probeConfigurations(primitive.choices)

    return {
      type: primitive.type,
      verdict: probeEditableDecoration(primitive.component, primitive.text, configurations),
      placement: probePlacement(
        primitive.component,
        primitive.slots,
        primitive.text,
        configurations,
        primitive.behaviours
      ),
    }
  })

  return {
    audits,
    notDecorated: audits.filter((audit) => audit.verdict.outcome === "not-decorated").map((audit) => audit.type),
    notProbeable: audits.filter((audit) => audit.verdict.outcome === "not-probeable").map((audit) => audit.type),
    unplacedSlots: audits
      .filter((audit) => unplacedIn(audit.placement).length > 0)
      .map((audit) => ({ type: audit.type, slots: unplacedIn(audit.placement) })),
    unplacedBehaviours: audits
      .filter((audit) => unplacedBehavioursIn(audit.placement).length > 0)
      .map((audit) => ({ type: audit.type, behaviours: unplacedBehavioursIn(audit.placement) })),
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

  if (placement.unplacedBehaviours.length > 0) {
    return `takes the ${placement.unplacedBehaviours.join(", ")} behaviour and does not place ${placement.unplacedBehaviours.length === 1 ? "its control" : "their controls"}`
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

/** One line per primitive, for a CLI or a failing test's message. */
export const describeRegistryAudit = (audit: RegistryAudit): string =>
  audit.audits
    .map((entry) => `${entry.type}: ${describeVerdict(entry.verdict)}; ${describePlacement(entry.placement)}`)
    .join("\n")
