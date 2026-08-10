import type { GatePolicy } from "./policy.js"

/**
 * What a policy contains, as one comparable string.
 *
 * 0033 made `policyId` a host-declared name and put a contract on the host: a
 * name identifies content, so a host that edits a policy renames it. The runtime
 * could not check that, and said so. This is the check — stored *beside* the
 * name, never instead of it, because a digest is not something a person can look
 * up in their own configuration.
 *
 * A fingerprint is `<shape>:<values>`, and the two halves answer two different
 * questions:
 *
 * - **shape** digests which knobs exist. It changes when a version of Loom adds
 *   or removes a policy field, and at no other time.
 * - **values** digests what those knobs are set to. It changes when a host edits
 *   its policy.
 *
 * Keeping them apart is the whole point. Without the shape half, upgrading Loom
 * would change every fingerprint in the corpus and every reader would report that
 * hosts had edited policies they had not touched. With it, records from either
 * side of an upgrade are *incomparable* — an honest "cannot tell" rather than a
 * confident wrong answer.
 *
 * This is an integrity check against accidental drift, not a seal. A host that
 * wants its records to misdescribe its policy can simply not change anything, and
 * no digest reaches that. The threat is a knob nudged in a config file and
 * forgotten, which is the failure that actually happens.
 */

type CanonicalField =
  | { readonly kind: "atom"; readonly value: string | number | boolean }
  /** Order and repetition do not change what the Gate does, so neither may change the digest. */
  | { readonly kind: "set"; readonly members: readonly string[] }
  /** Keys are host data, not structure: adding an entry is an edit, not a new shape. */
  | { readonly kind: "map"; readonly entries: Readonly<Record<string, string | undefined>> }
  /** Keys are structure: they are part of the shape, like the top level. */
  | { readonly kind: "struct"; readonly fields: Readonly<Record<string, CanonicalField>> }

const atom = (value: string | number | boolean): CanonicalField => ({ kind: "atom", value })
const set = (members: readonly string[]): CanonicalField => ({ kind: "set", members })
const map = (entries: Readonly<Record<string, string | undefined>>): CanonicalField => ({
  kind: "map",
  entries,
})
const struct = (fields: Readonly<Record<string, CanonicalField>>): CanonicalField => ({
  kind: "struct",
  fields,
})

/**
 * Everything the Gate consults, and nothing else. `policyId` is excluded because
 * the pair is the point: a name and a fingerprint that disagree is exactly the
 * situation worth reporting, and folding the name in would make every renamed
 * policy look like an edited one.
 */
type PolicyContent = Omit<GatePolicy, "policyId">

/**
 * The mapped type is the guard rail. A field added to `GatePolicy` is a
 * compile error here until someone says how it is digested — a fingerprint that
 * silently stopped covering a knob would report "unchanged" about a policy that
 * had changed, which is worse than having no fingerprint at all.
 */
type PolicyProjection = { readonly [K in keyof PolicyContent]-?: CanonicalField }

const project = (policy: GatePolicy): PolicyProjection => ({
  protectedPrimitiveTypes: set(policy.protectedPrimitiveTypes),
  outOfTreeEffectTypes: set(policy.outOfTreeEffectTypes),
  protectedPropKeys: set(policy.protectedPropKeys),
  removalThresholds: struct({
    medium: atom(policy.removalThresholds.medium),
    high: atom(policy.removalThresholds.high),
  }),
  breadthThreshold: atom(policy.breadthThreshold),
  shallowDepthThreshold: atom(policy.shallowDepthThreshold),
  inverseRetentionBudget: atom(policy.inverseRetentionBudget),
  minimumConfidence: atom(policy.minimumConfidence),
  confidenceFloor: atom(policy.confidenceFloor),
  autoApplyCeiling: map(policy.autoApplyCeiling),
  refusalFloor: atom(policy.refusalFloor),
})

const byKey = <T>([left]: readonly [string, T], [right]: readonly [string, T]): number =>
  left < right ? -1 : left > right ? 1 : 0

const sortedEntries = <T>(
  record: Readonly<Record<string, T>>
): readonly (readonly [string, T])[] => Object.entries(record).sort(byKey)

/** Every key path that is structure rather than data, in a stable order. */
const shapePathsOf = (field: CanonicalField, path: string): readonly string[] => {
  if (field.kind !== "struct") return [path]

  return sortedEntries(field.fields).flatMap(([key, nested]) =>
    shapePathsOf(nested, `${path}.${key}`)
  )
}

/**
 * JSON encoding of every atom, so a value containing the separator cannot forge
 * one. Sets are sorted and deduplicated, because a vocabulary list is a
 * membership test and neither order nor repetition reaches a decision.
 *
 * The map's filter is narrowing rather than a branch: a `Partial` record yields
 * `V | undefined` from `Object.entries`, and an entry with no value would have to
 * be dropped anyway — an unset ceiling and an absent one are one policy to
 * `ceilingFor`.
 */
const encodeField = (field: CanonicalField, path: string): readonly string[] => {
  switch (field.kind) {
    case "atom":
      return [`${path}=${JSON.stringify(field.value)}`]
    case "set":
      return [`${path}=${JSON.stringify(Array.from(new Set(field.members)).sort())}`]
    case "map": {
      const entries = sortedEntries(field.entries).filter(
        (entry): entry is readonly [string, string] => entry[1] !== undefined
      )

      return [`${path}=${JSON.stringify(entries)}`]
    }
    case "struct":
      return sortedEntries(field.fields).flatMap(([key, nested]) =>
        encodeField(nested, `${path}.${key}`)
      )
  }
}

const FNV_OFFSET_BASIS = 0xcbf29ce484222325n
const FNV_PRIME = 0x100000001b3n
const SIXTY_FOUR_BITS = 0xffffffffffffffffn

/**
 * FNV-1a, 64-bit, written out rather than imported.
 *
 * A cryptographic digest would need `crypto.subtle`, which is asynchronous, and
 * the Gate is synchronous and pure by decision (0002, 0033) — stamping a
 * fingerprint must not be the thing that makes a decision await something. There
 * is no adversary here to resist, only accident, and accidental collision across
 * the handful of policies a host runs is not a risk worth an async decision path.
 */
const digest = (input: string): string => {
  let hash = FNV_OFFSET_BASIS

  for (const byte of new TextEncoder().encode(input)) {
    hash = ((hash ^ BigInt(byte)) * FNV_PRIME) & SIXTY_FOUR_BITS
  }

  return hash.toString(16).padStart(16, "0")
}

const SHAPE_LENGTH = 8
const FINGERPRINT_SEPARATOR = ":"

export const policyFingerprintOf = (policy: GatePolicy): string => {
  const fields = sortedEntries<CanonicalField>(project(policy))

  const shape = fields.flatMap(([key, field]) => shapePathsOf(field, key))
  const values = fields.flatMap(([key, field]) => encodeField(field, key))

  return [
    digest(shape.join("\n")).slice(0, SHAPE_LENGTH),
    digest(values.join("\n")),
  ].join(FINGERPRINT_SEPARATOR)
}

/**
 * Which set of knobs a fingerprint describes. Total on purpose: a string that is
 * not a fingerprint this version produced is treated as its own shape, so it
 * compares as *incomparable* to everything. Failing toward "cannot tell" is the
 * right direction — the alternative is a malformed record silently reading as
 * agreement.
 */
export const policyShapeOf = (fingerprint: string): string => {
  const separator = fingerprint.indexOf(FINGERPRINT_SEPARATOR)

  return separator === -1 ? fingerprint : fingerprint.slice(0, separator)
}

/**
 * What a set of fingerprints seen under one policy name says about that name.
 *
 * - `unrecorded` — nothing carried a fingerprint. Every one of those judgments
 *   predates this field, and no amount of reading will recover what they ran on.
 * - `single` — one ruleset judged all of them. The name held.
 * - `changed` — two fingerprints of the same shape differ, so a host edited a
 *   policy without renaming it, and records naming it describe two gates.
 * - `incomparable` — the fingerprints come from different versions of the policy
 *   schema. Something may have been edited too; this cannot say.
 *
 * `single` is a statement about the fingerprints present and nothing else. A
 * segment that also holds unfingerprinted judgments is not thereby proven
 * constant, which is why the count of those is reported alongside rather than
 * folded in here.
 */
export type RulesetContinuity = "unrecorded" | "single" | "changed" | "incomparable"

export const rulesetContinuityOf = (fingerprints: readonly string[]): RulesetContinuity => {
  const distinct = new Set(fingerprints)
  if (distinct.size === 0) return "unrecorded"
  if (distinct.size === 1) return "single"

  const shapes = new Set(Array.from(distinct, policyShapeOf))

  return shapes.size === distinct.size ? "incomparable" : "changed"
}
