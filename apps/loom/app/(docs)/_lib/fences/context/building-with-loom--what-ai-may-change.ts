import type { Clock, ChangeInterpreter, EventSink, IdFactory } from "@loom/runtime"
import type { PrimitiveRegistry } from "@loom/runtime/sdk"

/**
 * What AI may change.
 *
 * This page is written from inside a project that has already been built: it has
 * a registry of its own primitives, and it has assembled the four things a
 * runtime is made of. The page is about the fifth — the policy — so the other
 * four are the story's, and a reader is meant to substitute their own.
 *
 * `gatePolicySchema`, `interactiveTypesFor` and `fixedPolicy` are the runtime's,
 * and the page imports every one of them itself.
 */

/** Your primitives, as `definePrimitive` and `registryOf` left them. */
export declare const registry: PrimitiveRegistry

/** The four the deployment assembled before it chose a policy. */
export declare const interpreter: ChangeInterpreter
export declare const events: EventSink
export declare const clock: Clock
export declare const idFactory: IdFactory
