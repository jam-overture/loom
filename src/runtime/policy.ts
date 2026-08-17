import { z } from "zod"

import { interactiveTypesSchema, type InteractiveTypes } from "../interactivity.js"
import { primitiveTypeSchema, type PrimitiveType } from "../primitive-type.js"

import { intentOriginSchema, type IntentOrigin } from "./intent.js"
import { stakeLevelSchema, type StakeLevel } from "./stake-level.js"

/**
 * Everything the Gate needs that is a choice rather than a fact.
 *
 * Two kinds of knob live here. The vocabulary knobs (which primitives and prop
 * keys matter) are host-supplied, because Loom Core cannot know that
 * `commerce.checkout` is more consequential than `layout.stack`. The structural
 * knobs (how big a removal is "large", how close to the root counts as
 * restructuring) are host-independent and ship with defaults.
 */

export const gatePolicySchema = z.object({
  /**
   * What a disposition says when asked which policy judged the change.
   *
   * Host-declared rather than runtime-minted, like `Provenance.interpreter`:
   * the runtime cannot know what distinguishes a host's two policies, and a
   * name the host chose is one it can find again in its own configuration.
   *
   * The contract that makes it worth recording: **a name identifies content**.
   * A host that changes what a policy contains gives it a new name, because
   * every disposition already written under the old one claims to have been
   * judged by what that name meant then.
   */
  policyId: z.string().min(1).default("default"),
  /** Touching one of these elevates the change. Host vocabulary. */
  protectedPrimitiveTypes: z.array(primitiveTypeSchema).default([]),
  /**
   * Primitives whose configuration reaches outside the tree — a live payment
   * flow, a sent notification. Reverting the tree does not revert the effect,
   * so changes touching these are never treated as reversible.
   */
  outOfTreeEffectTypes: z.array(primitiveTypeSchema).default([]),
  /** Prop keys that carry meaning rather than presentation. Host vocabulary. */
  protectedPropKeys: z.array(z.string().min(1)).default([]),
  /**
   * Primitives that render a target the reader aims at — an anchor, a button —
   * and what makes them one. A change that leaves one of these inside another
   * produces markup a browser resolves by dropping a link, so the page renders
   * and something on it stops working.
   *
   * Host vocabulary like the lists above, but the host does not have to write
   * it: `interactiveTypesFor(registry)` in the SDK reads what each primitive
   * declared about itself, so the knowledge stays with the component rather
   * than in a policy file that drifts from it. Empty by default, which is
   * exactly today's behaviour — a deployment that declares nothing is judged on
   * shape alone.
   */
  interactiveTypes: interactiveTypesSchema.default({}),

  removalThresholds: z
    .object({
      medium: z.number().int().positive(),
      high: z.number().int().positive(),
    })
    .default({ medium: 3, high: 12 }),
  /** Distinct nodes touched before a change counts as broad. */
  breadthThreshold: z.number().int().positive().default(8),
  /** Depth at or above which a structural change counts as restructuring. */
  shallowDepthThreshold: z.number().int().nonnegative().default(1),
  /** Nodes an inverse delta may retain before undo stops being practical. */
  inverseRetentionBudget: z.number().int().positive().default(200),

  /** Below this, the change needs confirmation; below the floor, it is refused. */
  minimumConfidence: z.number().min(0).max(1).default(0.7),
  confidenceFloor: z.number().min(0).max(1).default(0.3),

  /**
   * The highest stakes each origin may apply without asking. An explicit human
   * instruction earns more latitude than an adaptation nobody requested.
   */
  autoApplyCeiling: z
    .record(intentOriginSchema, stakeLevelSchema)
    .default({
      "user-instruction": "medium",
      "system-signal": "low",
      "scheduled-adaptation": "low",
      developer: "high",
    }),
  /** At or above this, the change is refused outright rather than offered. */
  refusalFloor: stakeLevelSchema.default("critical"),
})

export type GatePolicy = {
  readonly policyId: string
  readonly protectedPrimitiveTypes: readonly PrimitiveType[]
  readonly outOfTreeEffectTypes: readonly PrimitiveType[]
  readonly protectedPropKeys: readonly string[]
  readonly interactiveTypes: InteractiveTypes
  readonly removalThresholds: { readonly medium: number; readonly high: number }
  readonly breadthThreshold: number
  readonly shallowDepthThreshold: number
  readonly inverseRetentionBudget: number
  readonly minimumConfidence: number
  readonly confidenceFloor: number
  readonly autoApplyCeiling: Readonly<Partial<Record<IntentOrigin, StakeLevel>>>
  readonly refusalFloor: StakeLevel
}

/**
 * The structural knobs are opinionated; the vocabulary lists are empty because
 * only the host knows which of its primitives are consequential. With no
 * vocabulary declared, stakes are driven entirely by shape — how much is
 * removed, how broadly, how close to the root.
 */
export const defaultGatePolicy: GatePolicy = gatePolicySchema.parse({})

export const ceilingFor = (policy: GatePolicy, origin: IntentOrigin): StakeLevel =>
  policy.autoApplyCeiling[origin] ?? "low"
