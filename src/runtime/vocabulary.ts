import { parseBindings } from "../data/binding.js"
import type { BindingName } from "../data/source.js"
import type { NodeId } from "../ids.js"
import type { JsonObject } from "../json.js"
import type { PrimitiveType } from "../primitive-type.js"
import type { PropsIssue, PropsVerdict } from "../render/props.js"
import { unreadBindings, type BindingReader } from "../render/reads.js"
import { partitionReservedProps } from "../reserved-props.js"
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
 * What a host that has declared no vocabulary gets, which is today's behavior.
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

/**
 * What a deployment's primitives accept, as far as the write path is concerned.
 *
 * The type-name vocabulary above answers *can this be drawn at all*. This one
 * answers the question directly beneath it: the type is registered, and does
 * the node carry props the primitive declaring that type will accept? The
 * render seam has always known — a node whose props fail its declared schema is
 * omitted and reported as `invalid-props` (0009) — and nothing upstream shared
 * the knowledge, so a delta carrying two hundred characters against a maximum
 * of a hundred and sixty was appended to the log and found out about at the
 * next render, by every reader rather than by the one who asked (0179).
 *
 * `PropsValidator`'s own verdict, rather than a boolean or a second vocabulary
 * of failure. A predicate would throw away the issues, and a refusal that
 * cannot say *which* prop and *why* is the one a repairer can do nothing with.
 * Reusing the type also means the two seams cannot drift: what the renderer
 * would decline to draw is, by construction, what the write path declines to
 * write.
 *
 * **A vocabulary is handed a node's own props, with the runtime's reserved keys
 * already removed** — the same bag `renderElement` hands the validator, and the
 * same bag the primitive itself is handed. That is the whole of the contract
 * and it is stated here rather than left to each implementation, because the
 * one thing this type exists to guarantee is that the two seams agree.
 */

export type PropsVocabulary = (type: PrimitiveType, props: JsonObject) => PropsVerdict

/**
 * What a host that has wired no props vocabulary gets, which is today's
 * behavior.
 *
 * `undeclared` rather than `valid`, and the distinction is not academic: the
 * render seam already separates *these props are fine* from *nobody said what
 * fine is*, and answering the first on a deployment that has declared nothing
 * would be the runtime inventing a claim no schema made.
 */
export const EVERY_TYPE_UNDECLARED: PropsVocabulary = () => ({ outcome: "undeclared" })

/** A node a change would leave carrying props its own primitive refuses. */
export type InvalidProps = {
  readonly nodeId: NodeId
  readonly type: PrimitiveType
  readonly issues: readonly PropsIssue[]
}

/**
 * Every element in a subtree whose props its declaring primitive refuses, in
 * document order.
 *
 * The whole subtree rather than its root, for the reason `unknownPrimitivesIn`
 * gives: an inserted band carries its own children, and a node three levels
 * down that will not draw is the same hole.
 *
 * Reserved props are split off first, exactly as `renderElement` does, and the
 * split is the same function rather than a second one that agrees. A `loom:`
 * key is the runtime's own — it never reaches a primitive, so no primitive's
 * schema has any business being asked about it, and every schema in the starter
 * library is `.strict()` on the strength of that. A walk that handed the raw
 * props over refused, at the write path's highest stakes, the very JSON
 * `interpretation/prompt.ts` teaches a model to write.
 *
 * `partitionReservedProps` is not behind the render boundary: it lives in
 * `reserved-props.ts` beside `json.ts`, for the reason that module gives — a
 * reserved key is a property of a node's props rather than of rendering. Both
 * seams reading the one copy is what makes their agreement a fact instead of a
 * coincidence when a fifth key lands.
 *
 * What this does **not** do is judge the reserved keys themselves. A key the
 * runtime does not recognise, or `loom:theme` somewhere other than the root,
 * are real faults that the render seam reports and this seam stays silent
 * about; 0203 records why, and what catching them here would cost.
 */
export const invalidPropsIn = (
  node: LoomNode,
  checkProps: PropsVocabulary
): readonly InvalidProps[] =>
  Array.from(walkTree(node)).flatMap((current) => {
    if (current.kind !== "element") return []

    const { props } = partitionReservedProps(current.props)
    const verdict = checkProps(current.type, props)

    return verdict.outcome === "invalid"
      ? [{ nodeId: current.id, type: current.type, issues: verdict.issues }]
      : []
  })

/**
 * A sentence naming the node, its type and what its schema said.
 *
 * The issue messages come from the declaring schema and can quote a rejected
 * value, which `PropsIssue` warns about: this is content, and a consumer that
 * puts it on a screen is putting a model's own words there. It is included
 * anyway, because *this is too long* without *by how much, and which prop* is
 * the refusal a repairer cannot act on.
 */
export const describeInvalidProps = (invalid: InvalidProps): string =>
  `${invalid.type} at ${invalid.nodeId} (${invalid.issues
    .map((issue) => `${issue.path}: ${issue.message}`)
    .join("; ")})`

/**
 * What a deployment's primitives *read*, as far as the write path is concerned.
 *
 * The third question in this module, under the two above it. `PrimitiveVocabulary`
 * answers *can this be drawn at all*; `PropsVocabulary` answers *will its own
 * primitive accept what it carries*; this one answers the question a bound node
 * raises and neither of those can see — the type is registered, the props are
 * fine, and **is anything going to look at the answer this node is asking for?**
 *
 * A binding is a question the tree asks under a name, and the name is how the
 * primitive reading it finds the answer (0058). Three of the four ways that
 * declaration can be wrong are already refused before a delta lands: an
 * unregistered source and an undeclared param are refused at the data seam, and
 * a malformed `loom:data` never parses. The fourth resolves perfectly — a name
 * nothing reads costs the host a round trip to its own source, hands the answer
 * to a primitive that looks under a different name, and draws the empty state.
 *
 * `BindingReader`, the renderer's own seam, rather than a fourth vocabulary
 * shaped for this side. It is the same move `PropsVocabulary` makes with
 * `PropsVerdict` and for the identical reason: what the renderer reports as
 * `data-unread` is then, by construction, what the write path declines to write,
 * and an SDK registry already satisfies it structurally — so a host hands the
 * same object to both seams and there is nothing here that can drift or go
 * missing.
 *
 * Handed to the write path rather than declared on the policy, which is 0179's
 * rule and this is the second thing it covers: a reader is behavior, a policy
 * is data with a fingerprint, and a policy carrying a function is a policy that
 * cannot be compared with the one that decided yesterday.
 */

/**
 * What a host that has handed no reader gets, which is today's behavior.
 *
 * `undefined` for every type rather than an empty list, and the asymmetry with
 * `EVERY_TYPE_REGISTERED` is `unreadBindings`' own bargain rather than a second
 * judgement: absence and emptiness are different answers (0181), `undefined`
 * means *nobody has said*, and nothing is reported for it. A reader that
 * answered `[]` would claim every primitive reads no binding and refuse every
 * bound node on every deployment that has not opted in.
 */
export const NOTHING_DECLARED: BindingReader = { bindingsReadBy: () => undefined }

/** A question a change would leave on the page that no primitive will look at. */
export type UnreadBinding = {
  readonly nodeId: NodeId
  readonly type: PrimitiveType
  /** The name the node asked under, which is the half the primitive does not hold. */
  readonly name: BindingName
}

/**
 * Every binding in a subtree whose name its own primitive says it does not read,
 * in document order and name-sorted within a node.
 *
 * Measured on the **declaration** rather than on the answers, which is the one
 * place this walk differs from `reportUnreadBindings` in the renderer, and the
 * difference is forced rather than chosen: there are no answers here. Nothing
 * has been asked, no source has run, and the question of whether one *could*
 * have answered is not this seam's. That turns out to be the stronger reading
 * anyway — a name nothing reads is wrong whether or not the source behind it
 * happens to be up.
 *
 * A node whose `loom:data` does not parse contributes nothing. `parseBindings`
 * refuses the whole map together and the renderer reports that separately
 * (0058); there are no names in a malformed declaration to be read, so there is
 * nothing here to say about one that has not already been said louder.
 *
 * The whole subtree rather than its root, for the reason `unknownPrimitivesIn`
 * gives: an inserted band carries its own children, and a wasted round trip
 * three levels down is the same wasted round trip.
 */
export const unreadBindingsIn = (
  node: LoomNode,
  reads: BindingReader
): readonly UnreadBinding[] =>
  Array.from(walkTree(node)).flatMap((current) => {
    if (current.kind !== "element") return []

    const declared = reads.bindingsReadBy(current.type)
    if (declared === undefined) return []

    const bindings = parseBindings(current.props["loom:data"] ?? {})
    if (!bindings.ok) return []

    /**
     * The seam decides in plain strings, so the brand is recovered by looking
     * the answer back up among the names that were handed in rather than by
     * asserting it — the move `parseBindings` makes one module over, for its
     * reason: filtering keeps the one place that could be wrong honest.
     */
    const asked = new Map<string, BindingName>(
      Array.from(bindings.value.keys()).map((name) => [name, name])
    )

    return unreadBindings(asked.keys(), declared, current.props).flatMap((name) => {
      const named = asked.get(name)

      return named === undefined ? [] : [{ nodeId: current.id, type: current.type, name: named }]
    })
  })

export const describeUnreadBinding = (unread: UnreadBinding): string =>
  `${unread.nodeId} asks under "${unread.name}", which ${unread.type} does not read`
