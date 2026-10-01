import type { PrimitiveType } from "../primitive-type.js"
import type { PropsVocabulary } from "../runtime/vocabulary.js"

import type { PrimitiveRegistry } from "./registry.js"

/**
 * How a library tells the Gate which primitives exist at all.
 *
 * The renderer already resolves against this registry and reports an
 * `unknown-primitive` diagnostic for anything it does not hold. Reading the
 * same list into a policy is what lets the write path refuse the node before
 * the log keeps it (0173).
 */

/**
 * Every type a registry can draw, in the shape a Gate policy takes.
 *
 * Derived rather than hand-written for the reason `interactiveTypesFor` gives,
 * and the cost of getting it wrong here is higher: a hand-kept list that is
 * missing a type the registry has refuses changes the deployment could have
 * drawn perfectly well, and every primitive added is a chance to forget.
 *
 * Deriving it is still the host's explicit call. A deployment that wants the
 * check off leaves this out of its policy and gets the runtime's prior
 * behavior; a deployment with a second registry concatenates two of these.
 */
export const registeredTypesFor = (registry: PrimitiveRegistry): readonly PrimitiveType[] =>
  registry.primitives.map((primitive) => primitive.type)

/**
 * What a registry's primitives accept, in the shape the write path takes.
 *
 * `PrimitiveRegistry` already satisfies `PropsValidator` — the renderer is
 * handed the registry itself — so this is a one-line adapter and that is the
 * point of it. A host that writes the closure by hand can write a different
 * one, and a deployment whose Gate and whose renderer disagree about which
 * props are acceptable has a hole that no test of either seam alone finds.
 *
 * Wiring it is still the host's explicit call, for the reason
 * `registeredTypesFor` gives one layer up: a runtime handed none checks
 * nothing, which is the behavior every deployment had before 0179.
 */
export const propsVocabularyFor =
  (registry: PrimitiveRegistry): PropsVocabulary =>
  (type, props) =>
    registry.validateProps(type, props)
