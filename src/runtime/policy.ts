import { z } from "zod"

import { interactiveTypesSchema } from "../interactivity.js"
import { primitiveTypeSchema } from "../primitive-type.js"

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
   * puts a control where the reader cannot reach it, so the page renders and
   * something on it stops working.
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

/**
 * The policy as the schema states it, with the immutability the type used to
 * state separately.
 *
 * `z.infer` gives the fields and their value types; what it does not give is
 * `readonly`, on the properties or on the arrays inside them. Both matter here:
 * a policy is passed to every judgement the Gate makes and none of them may
 * alter it, and `protectedPrimitiveTypes.push(…)` is the mistake that would
 * change what a deployment refuses halfway through a run.
 *
 * One level of nesting is deliberate rather than a general deep-readonly. Every
 * field below is a scalar, an array of scalars, or a record one level deep, so a
 * mapped type that handles those three cases covers the schema exactly and stays
 * something a reader can evaluate in their head. A field that nested deeper
 * would need this widened, and would be the moment to ask whether it belongs in
 * a policy at all.
 */
type PolicyShape<T> = {
  readonly [K in keyof T]: T[K] extends readonly (infer E)[] ? readonly E[] : Readonly<T[K]>
}

/**
 * Derived rather than declared, because stating it twice meant only one of the
 * two directions of drift was caught.
 *
 * `defaultGatePolicy: GatePolicy = gatePolicySchema.parse({})` looks like it
 * holds the schema and the type together and holds half of it: a field *removed*
 * from the schema makes the parsed value un-assignable and fails the build, and
 * a field *added* to the schema is an excess property on a returned value rather
 * than on a fresh object literal — so it is assignable, it compiles, and
 * `keyof GatePolicy` never hears about it. Every consumer keyed on the type,
 * including the documentation site's `Record<keyof GatePolicy, Knob>`, silently
 * omitted the new knob.
 *
 * Filed by `Loom docs` on 4 September, who caught it from outside with a test
 * comparing `KNOB_ORDER` to `Object.keys(gatePolicySchema.shape)`. That test is
 * right and is in the wrong repository layer — the docs site telling the runtime
 * about a mismatch inside the runtime — and a second consumer keying off
 * `keyof GatePolicy` would have got no such warning. With one list there is
 * nothing left to disagree.
 */
export type GatePolicy = PolicyShape<z.infer<typeof gatePolicySchema>>

/**
 * The structural knobs are opinionated; the vocabulary lists are empty because
 * only the host knows which of its primitives are consequential. With no
 * vocabulary declared, stakes are driven entirely by shape — how much is
 * removed, how broadly, how close to the root.
 */
export const defaultGatePolicy: GatePolicy = gatePolicySchema.parse({})

export const ceilingFor = (policy: GatePolicy, origin: IntentOrigin): StakeLevel =>
  policy.autoApplyCeiling[origin] ?? "low"
