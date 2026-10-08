import type { InteractiveTypes, InteractiveWhen } from "../interactivity.js"

import type { IntentOrigin } from "./intent.js"
import { policyFingerprintOf } from "./policy-fingerprint.js"
import type { GatePolicy } from "./policy.js"
import { compareStakes, type StakeLevel } from "./stake-level.js"

/**
 * What one policy edit did, field by field.
 *
 * `policyFingerprintOf` can prove two judgments ran under different rules and
 * can say nothing about *how* they differed, because a digest has no middle: two
 * fingerprints either match or they do not. That is the whole of what a reader
 * of a changed policy is asking — a refusal rate that moved the week somebody
 * edited a policy is either explained by the edit or is a fault, and a hash
 * cannot tell those apart.
 *
 * So this is the fingerprint's other half, and it is deliberately *derived*
 * rather than stored. 0016's relationship one level up: the log is the truth and
 * the reading is a view. A policy log keeps whole policies and this says what
 * happened between two of them, so there is never a recorded diff free to
 * disagree with the policies it claims to describe.
 *
 * It is pure, synchronous and reads nothing but its two arguments — the
 * properties `policy-source.ts` requires of everything on the decision path, so
 * a host may call this while judging rather than only while reporting.
 */

/**
 * Which way an edit moved the Gate.
 *
 * The question every reader of a policy change actually has, and the reason this
 * module is more than a key-by-key comparison: *did it get easier or harder for
 * a change to get through.* A calibration window that straddles an edit is
 * legible exactly when this is known, and uninterpretable when it is not.
 *
 * - `stricter` — fewer changes get applied without asking, or more are refused.
 * - `looser` — the opposite.
 * - `mixed` — both, within one field. A set that gained a member and lost one
 *   is the common case, and reporting it as either would be a guess.
 * - `incomparable` — the field has no order. Renaming the policy or editing a
 *   host's own vocabulary into a different, equally large list is a change with
 *   no direction to it, and inventing one is worse than saying so.
 */
export type PolicyDirection = "stricter" | "looser" | "mixed" | "incomparable"

/** One field of `GatePolicy` that is not what it was, and what it is now. */
export type PolicyFieldChange = {
  readonly field: keyof GatePolicy
  readonly direction: PolicyDirection
  /**
   * What moved, in that field's own terms, for a reader.
   *
   * Prose, and documented as prose: a consumer that needs the values reads them
   * off the two policies it already has. The same rule `Disposition.reason`
   * keeps — a sentence is for a screen and never for a parser.
   */
  readonly detail: string
}

/**
 * What an edit did, and whether it is an edit at all.
 *
 * `fingerprints` is carried rather than recomputed by callers because the pair
 * is what joins this reading to the judgments either side of it: a `Disposition`
 * records the fingerprint it ran under, so a reader holding a change can find
 * the records on both sides of it without hashing anything itself.
 */
export type PolicyChange = {
  /** False when the two policies differ in nothing the Gate consults. */
  readonly changed: boolean
  /**
   * True when the two have different names, which a host editing a policy's
   * contents is under contract to produce (0033).
   */
  readonly renamed: boolean
  readonly fields: readonly PolicyFieldChange[]
  /**
   * The direction of the whole edit, folded over the fields that have one.
   *
   * `incomparable` fields are skipped rather than counted: an edit that tightened
   * a threshold and rewrote a host vocabulary list is *stricter* in the only
   * respect anything can be ordered by, and calling the pair `mixed` would hide
   * the one half that is knowable. An edit whose every field is incomparable is
   * itself `incomparable`, which is the honest answer and not a fallback.
   */
  readonly direction: PolicyDirection
  readonly fingerprints: {
    readonly was: string
    readonly now: string
  }
}

const compareStrings = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0

const sorted = (values: Iterable<string>): readonly string[] =>
  Array.from(new Set(values)).sort(compareStrings)

const missingFrom = (
  members: readonly string[],
  other: readonly string[]
): readonly string[] => {
  const held = new Set(other)

  return members.filter((member) => !held.has(member))
}

const list = (members: readonly string[]): string => members.join(", ")

/**
 * The direction a gained-and-lost pair points in, given what gaining means.
 *
 * Written once because every set and map field in a policy is one of these two
 * shapes and the fold is identical; what differs between fields is only whether
 * a longer list is a tighter gate, which is the `gaining` argument.
 */
const directionOf = (
  gained: boolean,
  lost: boolean,
  gaining: PolicyDirection
): PolicyDirection => {
  if (gained && lost) return "mixed"
  if (!gained && !lost) return "incomparable"

  const losing = gaining === "stricter" ? "looser" : "stricter"

  return gained ? gaining : losing
}

/**
 * A set field, compared.
 *
 * `gaining` is the field's own semantics and the only thing that varies: adding
 * a protected primitive type elevates more changes, so the list getting longer
 * is a tighter gate — while adding a registered primitive type permits an insert
 * that was refused, so there it is a looser one.
 */
const setChange = (
  field: keyof GatePolicy,
  was: readonly string[],
  now: readonly string[],
  gaining: PolicyDirection
): PolicyFieldChange | undefined => {
  const before = sorted(was)
  const after = sorted(now)
  const added = missingFrom(after, before)
  const removed = missingFrom(before, after)

  if (added.length === 0 && removed.length === 0) return undefined

  const parts = [
    ...(added.length > 0 ? [`added ${list(added)}`] : []),
    ...(removed.length > 0 ? [`removed ${list(removed)}`] : []),
  ]

  return {
    field,
    direction: directionOf(added.length > 0, removed.length > 0, gaining),
    detail: parts.join("; "),
  }
}

/**
 * A number field, compared. `raising` is the field's semantics, as `gaining` is
 * for a set: a higher `minimumConfidence` holds more changes back, while a
 * higher `breadthThreshold` lets a broader change stay unremarkable.
 */
const numberChange = (
  field: keyof GatePolicy,
  was: number,
  now: number,
  raising: PolicyDirection
): PolicyFieldChange | undefined => {
  if (was === now) return undefined

  const lowering = raising === "stricter" ? "looser" : "stricter"

  return {
    field,
    direction: now > was ? raising : lowering,
    detail: `${was} became ${now}`,
  }
}

/**
 * The interactive-types vocabulary, compared as a map of conditions.
 *
 * An entry whose condition changed is counted as both a gain and a loss, so it
 * reports `mixed` rather than picking a side: `always` becoming
 * `when: ["href"]` narrows which nodes are treated as targets, and widening the
 * prop list widens it back, and the two are not comparable through one entry's
 * `whenProps` without claiming to know the host's tree.
 */
const interactiveChange = (
  was: InteractiveTypes,
  now: InteractiveTypes
): PolicyFieldChange | undefined => {
  /**
   * `Object.hasOwn` before the read, which is not belt-and-braces: these keys
   * are primitive types a host wrote, and `interactivity.ts` records the trap —
   * a type named `constructor` or `toString` reads a function off
   * `Object.prototype` instead of answering "absent". Here that would be a
   * comparison crashing on a policy the Gate judges perfectly well.
   */
  const describe = (types: InteractiveTypes, type: string): string | undefined => {
    const when: InteractiveWhen | undefined = Object.hasOwn(types, type)
      ? types[type]
      : undefined

    return when === undefined
      ? undefined
      : when === "always"
        ? "always"
        : `when ${list(sorted(when.whenProps))}`
  }

  const types = sorted([...Object.keys(was), ...Object.keys(now)])
  const added: string[] = []
  const removed: string[] = []
  const altered: string[] = []

  for (const type of types) {
    const before = describe(was, type)
    const after = describe(now, type)

    if (before === after) continue
    if (before === undefined) added.push(`${type} (${after})`)
    else if (after === undefined) removed.push(type)
    else altered.push(`${type} (${before} became ${after})`)
  }

  if (added.length === 0 && removed.length === 0 && altered.length === 0) return undefined

  const parts = [
    ...(added.length > 0 ? [`added ${list(added)}`] : []),
    ...(removed.length > 0 ? [`removed ${list(removed)}`] : []),
    ...(altered.length > 0 ? [`changed ${list(altered)}`] : []),
  ]

  return {
    field: "interactiveTypes",
    direction: directionOf(
      added.length > 0 || altered.length > 0,
      removed.length > 0 || altered.length > 0,
      "stricter"
    ),
    detail: parts.join("; "),
  }
}

/**
 * The per-origin ceilings, compared as stake levels rather than as strings.
 *
 * `autoApplyCeiling` is the one map field with an ordered value, so an entry
 * that moved has a direction of its own: raising a ceiling applies more without
 * asking. An origin that gained an entry is read against `ceilingFor`'s own
 * fallback of `low` rather than against nothing, because that is what the Gate
 * does with an absent one — so writing `low` where there was no entry is not a
 * change, and the comparison says so instead of reporting an edit that changed
 * no decision.
 */
const ceilingChange = (
  was: GatePolicy["autoApplyCeiling"],
  now: GatePolicy["autoApplyCeiling"]
): PolicyFieldChange | undefined => {
  const origins = sorted([...Object.keys(was), ...Object.keys(now)]) as readonly IntentOrigin[]
  const moved: string[] = []
  let raised = false
  let lowered = false

  /** The same own-property rule as above, for the same reason. */
  const ceiling = (
    ceilings: GatePolicy["autoApplyCeiling"],
    origin: IntentOrigin
  ): StakeLevel => (Object.hasOwn(ceilings, origin) ? ceilings[origin] ?? "low" : "low")

  for (const origin of origins) {
    const before = ceiling(was, origin)
    const after = ceiling(now, origin)

    if (before === after) continue

    moved.push(`${origin} ${before} became ${after}`)
    if (compareStakes(after, before) > 0) raised = true
    else lowered = true
  }

  if (moved.length === 0) return undefined

  return {
    field: "autoApplyCeiling",
    direction: directionOf(raised, lowered, "looser"),
    detail: list(moved),
  }
}

/** The refusal floor, compared as a stake level. A higher floor refuses less. */
const floorChange = (was: StakeLevel, now: StakeLevel): PolicyFieldChange | undefined => {
  if (was === now) return undefined

  return {
    field: "refusalFloor",
    direction: compareStakes(now, was) > 0 ? "looser" : "stricter",
    detail: `${was} became ${now}`,
  }
}

/**
 * Every field of a policy, with how each one is compared.
 *
 * The mapped type is the same guard rail `policy-fingerprint.ts` uses, and for
 * the same reason: a field added to `GatePolicy` is a compile error here until
 * somebody says which way it moves the Gate. A comparison that silently stopped
 * covering a knob would report *nothing changed* about an edit that changed
 * something, which is the one answer worse than having no comparison at all.
 *
 * `policyId` is included and is the one entry that is not an ordering — a rename
 * is a fact about the name and never about the gate.
 */
type PolicyComparison = {
  readonly [K in keyof GatePolicy]-?: (
    was: GatePolicy,
    now: GatePolicy
  ) => PolicyFieldChange | undefined
}

const COMPARISON: PolicyComparison = {
  policyId: (was, now) =>
    was.policyId === now.policyId
      ? undefined
      : {
          field: "policyId",
          direction: "incomparable",
          detail: `${was.policyId} became ${now.policyId}`,
        },

  /** A longer list elevates more changes. */
  protectedPrimitiveTypes: (was, now) =>
    setChange(
      "protectedPrimitiveTypes",
      was.protectedPrimitiveTypes,
      now.protectedPrimitiveTypes,
      "stricter"
    ),

  /** A longer list treats more changes as irreversible. */
  outOfTreeEffectTypes: (was, now) =>
    setChange(
      "outOfTreeEffectTypes",
      was.outOfTreeEffectTypes,
      now.outOfTreeEffectTypes,
      "stricter"
    ),

  protectedPropKeys: (was, now) =>
    setChange("protectedPropKeys", was.protectedPropKeys, now.protectedPropKeys, "stricter"),

  interactiveTypes: (was, now) => interactiveChange(was.interactiveTypes, now.interactiveTypes),

  /**
   * The one list where longer is looser, and the one where emptiness is not the
   * zero of the ordering.
   *
   * `gatePolicySchema` documents it: an empty `registeredPrimitiveTypes` is
   * *undeclared*, not a library of nothing, so an unrenderable insert is
   * appended and reported at render. A list arriving where there was none is
   * therefore a limit arriving where there was no limit — the strictest move
   * this field can make — while every edit within a declared list reads the
   * ordinary way round, and emptying it removes the check altogether.
   */
  registeredPrimitiveTypes: (was, now) => {
    const change = setChange(
      "registeredPrimitiveTypes",
      was.registeredPrimitiveTypes,
      now.registeredPrimitiveTypes,
      "looser"
    )

    if (change === undefined) return undefined

    const declared = (policy: GatePolicy): boolean => policy.registeredPrimitiveTypes.length > 0

    if (!declared(was) && declared(now)) {
      return { ...change, direction: "stricter", detail: `${change.detail} (undeclared before)` }
    }

    if (declared(was) && !declared(now)) {
      return { ...change, direction: "looser", detail: `${change.detail} (undeclared now)` }
    }

    return change
  },

  /** A higher threshold lets a larger removal stay at lower stakes. */
  removalThresholds: (was, now) => {
    const medium = numberChange(
      "removalThresholds",
      was.removalThresholds.medium,
      now.removalThresholds.medium,
      "looser"
    )
    const high = numberChange(
      "removalThresholds",
      was.removalThresholds.high,
      now.removalThresholds.high,
      "looser"
    )

    if (medium === undefined && high === undefined) return undefined

    const parts = [
      ...(medium ? [`medium ${medium.detail}`] : []),
      ...(high ? [`high ${high.detail}`] : []),
    ]

    const directions = new Set(
      [medium?.direction, high?.direction].filter((it) => it !== undefined)
    )

    return {
      field: "removalThresholds",
      direction: directions.size === 1 ? [...directions][0]! : "mixed",
      detail: list(parts),
    }
  },

  breadthThreshold: (was, now) =>
    numberChange("breadthThreshold", was.breadthThreshold, now.breadthThreshold, "looser"),

  /**
   * A deeper threshold means a change has to be nearer the root before it counts
   * as restructuring, so raising it elevates fewer changes.
   */
  shallowDepthThreshold: (was, now) =>
    numberChange(
      "shallowDepthThreshold",
      was.shallowDepthThreshold,
      now.shallowDepthThreshold,
      "looser"
    ),

  /** A bigger budget keeps more changes undoable, so raising it refuses fewer. */
  inverseRetentionBudget: (was, now) =>
    numberChange(
      "inverseRetentionBudget",
      was.inverseRetentionBudget,
      now.inverseRetentionBudget,
      "looser"
    ),

  /** A higher bar holds more changes back for a person. */
  minimumConfidence: (was, now) =>
    numberChange("minimumConfidence", was.minimumConfidence, now.minimumConfidence, "stricter"),

  /** A higher floor refuses more outright. */
  confidenceFloor: (was, now) =>
    numberChange("confidenceFloor", was.confidenceFloor, now.confidenceFloor, "stricter"),

  autoApplyCeiling: (was, now) => ceilingChange(was.autoApplyCeiling, now.autoApplyCeiling),

  refusalFloor: (was, now) => floorChange(was.refusalFloor, now.refusalFloor),
}

/**
 * The order fields are reported in: the order `GatePolicy` declares them.
 *
 * Taken off the comparison table rather than sorted, because the schema's order
 * is already the one a reader of the policy file knows — name, then the host
 * vocabulary, then the structural thresholds, then the confidence bars, then the
 * two stake knobs. Sorting alphabetically would scatter the pairs that belong
 * side by side.
 */
const FIELDS = Object.keys(COMPARISON) as readonly (keyof GatePolicy)[]

/**
 * The direction of a whole edit, folded over the fields that have one.
 *
 * `incomparable` is both the identity of this fold and its answer for an edit
 * with nothing ordered in it, which is why it cannot be written as a reduce over
 * a default: a rename alone is incomparable, and a rename beside a raised
 * threshold is as strict as the threshold made it.
 */
const foldDirection = (fields: readonly PolicyFieldChange[]): PolicyDirection => {
  const ordered = fields.filter((change) => change.direction !== "incomparable")
  if (ordered.length === 0) return "incomparable"
  if (ordered.some((change) => change.direction === "mixed")) return "mixed"

  const distinct = new Set(ordered.map((change) => change.direction))

  return distinct.size === 1 ? [...distinct][0]! : "mixed"
}

/**
 * What changed between two policies, and which way it moved the Gate.
 *
 * Takes two whole policies rather than two fingerprints, because a digest is
 * one-way: the pair is the only thing that can answer this, and a log that kept
 * diffs instead of policies could not answer it about a pair it had not
 * anticipated.
 */
export const policyChangeOf = (was: GatePolicy, now: GatePolicy): PolicyChange => {
  const fields = FIELDS.flatMap((field) => {
    const change = COMPARISON[field](was, now)

    return change === undefined ? [] : [change]
  })

  return {
    changed: fields.length > 0,
    renamed: was.policyId !== now.policyId,
    fields,
    direction: foldDirection(fields),
    fingerprints: {
      was: policyFingerprintOf(was),
      now: policyFingerprintOf(now),
    },
  }
}
