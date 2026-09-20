import type { NodeId } from "../ids.js"
import type { PrimitiveType } from "../primitive-type.js"
import { walkTree } from "../tree/navigation.js"
import type { LoomNode } from "../tree/node.js"

/**
 * What a deployment's primitives are, as far as the write path is concerned.
 *
 * The render seam already knows this and says so after the fact: a node whose
 * type nothing resolved comes back as an `unknown-primitive` diagnostic beside
 * a page with a hole in it (0050). Nothing upstream of that had the same
 * knowledge, so a delta naming a type nobody registered was appended to the
 * log, judged on its shape, and found out about at the next render — for every
 * reader, not just the one who asked (0173).
 *
 * The vocabulary is a predicate rather than a list so that a deployment with
 * two registries composes them, and so that this module needs no import from
 * the SDK. `registeredTypesFor(registry)` in the SDK is how a host gets one
 * without hand-keeping it, the same move `interactiveTypesFor` makes.
 */

export type PrimitiveVocabulary = (type: PrimitiveType) => boolean

/**
 * What a host that has declared no vocabulary gets, which is today's behaviour.
 *
 * It answers `true` for everything rather than `false`, and the asymmetry with
 * `NOTHING_INTERACTIVE` is deliberate. Declaring nothing means *I have not told
 * you what I can draw*, which is not the same claim as *I can draw nothing* —
 * and a default that read the second way would refuse every insert on every
 * deployment that has not opted in.
 */
export const EVERY_TYPE_REGISTERED: PrimitiveVocabulary = () => true

/**
 * The vocabulary a list of registered types describes.
 *
 * An empty list answers `EVERY_TYPE_REGISTERED` for the reason above: a policy
 * field with an empty default is a host that has not spoken, and a host that
 * has not spoken is not a host claiming an empty library.
 *
 * A `Set` rather than an object index, for the reason `interactivePredicateFor`
 * gives: one lowercase segment is a whole namespaced id, so `constructor` is a
 * legal primitive type, and an ordinary object would report it registered on a
 * deployment that never registered it.
 */
export const primitiveVocabularyFor = (
  types: readonly PrimitiveType[]
): PrimitiveVocabulary => {
  if (types.length === 0) return EVERY_TYPE_REGISTERED

  const registered = new Set<string>(types)

  return (type) => registered.has(type)
}

/** A node a change would add whose type this deployment cannot draw. */
export type UnknownPrimitive = {
  readonly nodeId: NodeId
  readonly type: PrimitiveType
}

/**
 * Every element in a subtree whose type the vocabulary does not hold, in
 * document order.
 *
 * The whole subtree rather than its root, because an inserted band carries its
 * own children and a hole three levels down is the same hole.
 */
export const unknownPrimitivesIn = (
  node: LoomNode,
  isRegistered: PrimitiveVocabulary
): readonly UnknownPrimitive[] =>
  Array.from(walkTree(node)).flatMap((current) =>
    current.kind === "element" && !isRegistered(current.type)
      ? [{ nodeId: current.id, type: current.type }]
      : []
  )

export const describeUnknownPrimitive = (unknown: UnknownPrimitive): string =>
  `${unknown.type} at ${unknown.nodeId}`
