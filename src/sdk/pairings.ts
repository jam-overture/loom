import type { PrimitiveType } from "../primitive-type.js"
import type { PaletteSlot } from "../theme/theme.js"

import { probeColourPairings, probeConfigurations } from "./conformance.js"
import type { PrimitiveRegistry, RegisteredPrimitive } from "./registry.js"

/**
 * Every foreground-on-background a registry can put on a page, read off the
 * components rather than listed by hand.
 *
 * `PALETTE_TEXT_PAIRINGS` is the list the contrast bar measures, and its own
 * comment claims it is read off `src/primitives`. It was — once, by a person,
 * and then five primitives landed. The gap that opens is quiet in the worst
 * way: the audit reports no failures because it never looked, and a host
 * asserting `failures` empty gets a green tick for a pairing nobody measured.
 * This closes that by deriving the list, so a primitive that renders a new
 * pairing brings the pairing with it.
 *
 * ## The two bases, and why they are not the same claim
 *
 * **`painted`** — one primitive sets the ink and the ground beneath it.
 * `loom.callout` puts `fg-default` on the `bg-surface-muted` it painted. Both
 * ends are the primitive's own and no container can change either, so this is a
 * fact about the component with no judgement in it at all.
 *
 * **`composed`** — a primitive sets an ink and paints no ground under it, so
 * the ground is whatever it was placed in. `loom.perk` writes its excluded note
 * in `fg-subtle` and leaves the surface to its parent;
 * [0008](../../decisions/0008-the-renderer-is-a-total-pure-projection.md)
 * forbids the renderer from enforcing parentage, so any ground the text ramp is
 * held to is a place that note can land. A perk list inside an accent-toned
 * section is an ordinary tree, and this set is strictly larger than the one
 * anybody was maintaining by hand.
 *
 * ## The one thing this cannot derive
 *
 * Which grounds the text ramp is *meant* to work on. The probe can see that
 * `loom.action` puts children on `accent` and that `loom.page` puts them on
 * `bg-canvas`, and nothing in either component says that the first is a filled
 * control carrying its own `fg-on-accent` while the second is a page surface
 * that every ink in the ramp has to be readable on. Both set an ink beside the
 * ground; only one of them means it.
 *
 * That is a palette decision rather than a component fact —
 * [0089](../../decisions/0089-the-text-ramp-is-held-to-four-grounds.md) makes
 * it, and `PALETTE_TEXT_GROUNDS` is where it is written down. Passing it in is
 * what keeps this function free of a rule it would otherwise have to guess:
 * derive everything, declare the grounds, and a host with its own surfaces
 * declares its own. There were four of them until `bg-overlay` joined on
 * 21 September, which is why the list is a value rather than a number in a
 * sentence.
 */

/** Whether one primitive set both ends of a pairing, or only the ink. */
export type PairingBasis = "painted" | "composed"

/** One foreground-on-background the library can put on a page, and what produces it. */
export type DerivedPairing = {
  readonly foreground: PaletteSlot
  readonly background: PaletteSlot
  readonly basis: PairingBasis
  /** The primitives that produce it, so a failure names components rather than two slot ids. */
  readonly types: readonly PrimitiveType[]
}

/** A ground a primitive puts its declared children and slots on. */
export type ChildGround = {
  readonly ground: PaletteSlot
  readonly types: readonly PrimitiveType[]
}

/**
 * The props a primitive declares that no probe configuration sets, and which
 * therefore mark the edge of what this derivation can see.
 *
 * It is not that the prop is unset — the probe sets nothing but closed choices,
 * so a *required* prop is unset too. It is that a component written as
 * `given.price === undefined ? null : …` produces no element at all under an
 * absent optional prop, so any ink that element paints is invisible here, while
 * a required prop's element still renders and still shows its colour. Optional
 * and not a closed choice is exactly the set a component guards on and the probe
 * cannot open.
 *
 * `undefined` for a primitive whose schema is not an object schema and whose
 * props therefore cannot be enumerated — "I cannot tell you", which is not the
 * same claim as "there are none", and the same distinction `declaredProps`
 * makes.
 */
export type UnprobedProps = {
  readonly type: PrimitiveType
  readonly props: readonly string[] | undefined
}

/** What a registry's components paint, as the contrast bar needs to hear it. */
export type RegistryPairings = {
  readonly pairings: readonly DerivedPairing[]
  /** Inks a primitive sets without painting a ground of its own. */
  readonly floating: readonly PaletteSlot[]
  /** Every ground a primitive places children on, whether or not the ramp is held to it. */
  readonly childGrounds: readonly ChildGround[]
  /**
   * Grounds children land on that the text ramp is not held to. Not a failure:
   * `accent` is here because `loom.action` fills it and answers the ink itself.
   * It is reported because a *new* ground appearing here is the signal that
   * either a primitive is painting somewhere unconsidered or the declared list
   * has fallen behind the library — the same drift this module exists to catch,
   * one level up.
   */
  readonly groundsOutsideTheRamp: readonly ChildGround[]
  /** The probe could not answer — neither a pass nor a failure. */
  readonly notProbeable: readonly PrimitiveType[]
  /**
   * Where this derivation stops seeing, by primitive. Only primitives with at
   * least one such prop appear, so an empty list is a real claim: nothing in
   * this registry hides an element behind a prop the probe cannot set.
   *
   * Reported rather than fixed, because the alternative is a probe that invents
   * a price, a date and a URL — and a pairing derived from an invented value is
   * a fact about the invention. A list that says it is read off the components
   * should be able to say which part of them it read.
   */
  readonly unprobedProps: readonly UnprobedProps[]
}

type Seen = Map<string, { foreground: PaletteSlot; background: PaletteSlot; types: Set<PrimitiveType> }>

const record = (seen: Seen, foreground: PaletteSlot, background: PaletteSlot, type: PrimitiveType): void => {
  const at = `${foreground}|${background}`
  const existing = seen.get(at)

  if (existing) existing.types.add(type)
  else seen.set(at, { foreground, background, types: new Set([type]) })
}

const asPairings = (seen: Seen, basis: PairingBasis): readonly DerivedPairing[] =>
  [...seen.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, entry]) => ({
      foreground: entry.foreground,
      background: entry.background,
      basis,
      types: [...entry.types].sort(),
    }))

/**
 * The declared props no configuration sets: optional, and not a closed choice.
 * `undefined` props enumerate to `undefined` rather than to nothing.
 */
const unprobed = (primitive: RegisteredPrimitive): readonly string[] | undefined => {
  if (primitive.declaredProps === undefined) return undefined

  const varied = new Set(primitive.choices.map((choice) => choice.name))

  return primitive.declaredProps
    .filter((prop) => !prop.required && !varied.has(prop.name))
    .map((prop) => prop.name)
}

const asGrounds = (grounds: ReadonlyMap<PaletteSlot, Set<PrimitiveType>>): readonly ChildGround[] =>
  [...grounds.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ground, types]) => ({ ground, types: [...types].sort() }))

/**
 * Probes every primitive in a registry and assembles what they paint.
 *
 * Pass `PALETTE_TEXT_GROUNDS` unless the host has its own surfaces to declare.
 * Like `auditRegistry`, this calls every registered component, so it belongs in
 * a test or a build step rather than on a request.
 */
export const registryPairings = (
  registry: PrimitiveRegistry,
  textGrounds: readonly PaletteSlot[]
): RegistryPairings => {
  const probed = registry.primitives.map((primitive) => ({
    type: primitive.type,
    verdict: probeColourPairings(
      primitive.component,
      primitive.slots,
      primitive.text,
      probeConfigurations(primitive.choices)
    ),
  }))

  const painted: Seen = new Map()
  const floating = new Map<PaletteSlot, Set<PrimitiveType>>()
  const grounds = new Map<PaletteSlot, Set<PrimitiveType>>()

  for (const { type, verdict } of probed) {
    if (verdict.outcome !== "probed") continue

    for (const pairing of verdict.painted) record(painted, pairing.foreground, pairing.background, type)

    for (const ink of verdict.floating) {
      floating.set(ink, (floating.get(ink) ?? new Set<PrimitiveType>()).add(type))
    }

    for (const ground of verdict.childGrounds) {
      grounds.set(ground, (grounds.get(ground) ?? new Set<PrimitiveType>()).add(type))
    }
  }

  const held = new Set(textGrounds)
  const composed: Seen = new Map()

  for (const [ink, types] of floating) {
    for (const ground of textGrounds) {
      if (ink === ground) continue
      for (const type of types) record(composed, ink, ground, type)
    }
  }

  return {
    pairings: [...asPairings(painted, "painted"), ...asPairings(composed, "composed")],
    floating: [...floating.keys()].sort(),
    childGrounds: asGrounds(grounds),
    groundsOutsideTheRamp: asGrounds(new Map([...grounds].filter(([ground]) => !held.has(ground)))),
    notProbeable: probed.filter(({ verdict }) => verdict.outcome === "not-probeable").map(({ type }) => type),
    unprobedProps: registry.primitives
      .map((primitive) => ({ type: primitive.type, props: unprobed(primitive) }))
      .filter((entry) => entry.props === undefined || entry.props.length > 0),
  }
}
