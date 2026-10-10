import type { NodeId } from "../ids.js"
import type { PrimitiveType } from "../primitive-type.js"
import type { BindingReader } from "../render/reads.js"
import type { SlotPlacer } from "../render/slots.js"
import { assertNever, err, ok, type Result } from "../result.js"
import { applyOperation } from "../tree/apply.js"
import type { TreeDelta, TreeOperation } from "../tree/delta.js"
import type { TreeError } from "../tree/errors.js"
import { findNode, pathToNode, walkTree } from "../tree/navigation.js"
import type { LoomNode } from "../tree/node.js"
import type { LoomTree } from "../tree/tree.js"

import {
  nestedTargetsIn,
  NOTHING_INTERACTIVE,
  type InteractivePredicate,
  type NestedTarget,
} from "./nesting.js"
import { redirectedSubmissionsBetween, type RedirectedSubmission } from "./redirection.js"
import { repointedBindingsBetween, type RepointedBinding } from "./repointing.js"
import {
  EVERY_TYPE_REGISTERED,
  EVERY_TYPE_UNDECLARED,
  invalidPropsIn,
  NOTHING_DECLARED,
  NOTHING_PLACED,
  unknownPrimitivesIn,
  unplacedSlotsIn,
  unreadBindingsIn,
  type InvalidProps,
  type PrimitiveVocabulary,
  type PropsVocabulary,
  type UnknownPrimitive,
  type UnplacedSlot,
  type UnreadBinding,
} from "./vocabulary.js"

/**
 * Facts about what a delta does, extracted before anyone judges it.
 *
 * Analysis is deliberately separate from the Gate: this module knows what
 * changed and nothing about whether that is acceptable. Policy and judgment
 * live downstream, which means the Gate's rules can change without touching
 * how a change is measured.
 *
 * Two facts need vocabulary to state, and that is not the same as needing
 * judgment. "This node renders a target" and "this deployment has no primitive
 * for that type" are both properties of the host's primitives that no amount of
 * looking at the tree recovers, so they arrive as predicates; what either is
 * worth is still decided downstream.
 */

export type ChangeAnalysis = {
  readonly operationCount: number
  readonly insertedNodeCount: number
  readonly removedNodeCount: number
  /** Nodes a move operation named. The subtree each carried is counted separately. */
  readonly movedNodeCount: number
  readonly configuredNodeCount: number
  /**
   * Nodes a move carried, the node it named included. A move is the one
   * operation whose reach is larger than the node it names, and measuring it
   * that way is what makes the analysis independent of how the delta was
   * phrased: relocating a slot and relocating the card inside it are the same
   * physical change described two ways (0044).
   */
  readonly relocatedNodeCount: number
  /** Nodes directly touched. A move counts the node, not the subtree riding along. */
  readonly affectedNodeIds: readonly NodeId[]
  /**
   * Types this delta created, destroyed, or reconfigured. A move contributes
   * nothing here whichever node it names — a relocated node is not rewritten,
   * and `relocatedPrimitiveTypes` is where it is reported instead (0044).
   */
  readonly touchedPrimitiveTypes: readonly PrimitiveType[]
  /**
   * Types carried by a move, in the whole subtree rather than at its root. A
   * protected primitive travelling across the page is a fact the Gate has to
   * see, and it is not the same fact as one being rewritten.
   */
  readonly relocatedPrimitiveTypes: readonly PrimitiveType[]
  /**
   * Types destroyed outright, a subset of the touched types. Destroying a
   * primitive is a strictly bigger deal than reconfiguring one, so stakes need
   * to tell the two apart.
   */
  readonly removedPrimitiveTypes: readonly PrimitiveType[]
  readonly configuredPropKeys: readonly string[]
  /**
   * Targets this change leaves inside another target, which is a control the
   * reader cannot use. Sometimes because the markup is invalid and a browser
   * drops the inner link; sometimes because the enclosing node covers itself
   * with an overlay and the click never arrives (0068). Same damage either way,
   * and only the outer node's own declaration distinguishes it.
   *
   * Measured on the resulting tree rather than on the operations, because every
   * operation kind can produce it and only one of them looks like it does:
   * `insert` and `move` put a target somewhere, and `configure` breaks every
   * link already inside a card by giving the card an `href`. Positions the tree
   * already had are excluded, so a change is answerable for the breakage it
   * introduces and not for the breakage it inherited.
   *
   * Empty for every host that declares no interactive vocabulary, which is the
   * default.
   */
  readonly nestedTargets: readonly NestedTarget[]
  /**
   * Nodes this change would add that the deployment has no primitive for, so
   * the page it produces has a hole where each one is.
   *
   * Measured on the operations rather than on the resulting tree, unlike
   * `nestedTargets`, and the difference is the point. A tree may already name a
   * primitive a later deployment rolled back — that is exactly why the renderer
   * reports instead of throwing (0050) — and a change is answerable for the
   * holes it introduces, not for the ones it found. Only `insert` can introduce
   * one: `move` carries nodes the tree already had, and `configure` cannot
   * change a type.
   *
   * Empty for every host that declares no vocabulary, which is the default.
   */
  readonly unknownPrimitives: readonly UnknownPrimitive[]
  /**
   * Nodes this change would leave carrying props the primitive declaring their
   * type refuses, so the page it produces has a hole where each one is — the
   * same hole `unknownPrimitives` describes, one question further down.
   *
   * Measured on both trees, like `nestedTargets`, and unlike `unknownPrimitives`:
   * props are the one thing two operations in a delta can argue about, so only
   * the tree at the end says what a reader will actually be served.
   * `introducedInvalidProps` says why, and what a node already failing before
   * the change counts as.
   *
   * Empty for every host that wires no props vocabulary, which is the default.
   */
  readonly invalidProps: readonly InvalidProps[]
  /**
   * Questions this change would leave on the page that no primitive will look
   * at — a node asking under a name its own primitive says it does not read.
   *
   * The one fact in this record about a change that *works*. The page draws,
   * every node is registered, every schema is satisfied; the host pays a round
   * trip to its own source on every render and the region shows its empty state,
   * because the answer arrives under a name nobody opens (0181).
   *
   * Measured on both trees, like `invalidProps` and unlike `unknownPrimitives`,
   * and for that factor's reason twice over: a `configure` can put `loom:data` on
   * a node that had none, and a `configure` can rename the *prop* that names the
   * binding (0184), so two operations in one delta can argue about it and only
   * the tree at the end says what a reader will be served.
   *
   * Keyed by node **and name** where `invalidProps` is keyed by node alone, and
   * the difference is the harm rather than an oversight. A node whose props fail
   * is a hole, and a page has one hole there however many ways it is wrong; a
   * node asking three questions nothing reads is three wasted round trips, and a
   * change that adds the third is answerable for the third.
   *
   * Empty for every host that hands no reader, which is the default.
   */
  readonly unreadBindings: readonly UnreadBinding[]
  /**
   * Content this change would put in a region of a primitive that places no
   * region of that name, so the content and everything under it is dropped.
   *
   * The second fact in this record about a change that *works*, beside
   * `unreadBindings` and quieter than it. The page draws, every node is
   * registered, every schema is satisfied, nothing is fetched and wasted — and
   * a paragraph the author wrote is not on the page, with nothing anywhere
   * saying so until the render seam gained a diagnostic for it (0249).
   *
   * Measured on both trees, like `unreadBindings` and unlike
   * `unknownPrimitives`, and for the reason that factor's comment gives twice
   * over. A `move` can carry a slot child under a new parent that places no
   * such region, which is the case `unknownPrimitives` has no analogue of: a
   * type cannot be changed, and a region's fate depends on the parent it ends
   * up under rather than on the node itself.
   *
   * Keyed by node **and name** where `invalidProps` is keyed by node alone, for
   * `unreadBindings`' reason: a node that drops two regions has dropped two
   * pieces of content, and a change that adds the second is answerable for the
   * second.
   *
   * Empty for every host that hands no placer, which is the default.
   */
  readonly unplacedSlots: readonly UnplacedSlot[]
  /**
   * Forms this change points somewhere else — a node that posted to one
   * registered endpoint before and posts to another after.
   *
   * Measured on both trees, like `nestedTargets`, and unlike it needs no host
   * vocabulary: `loom:submit` is the runtime's own key. A node that gains or
   * loses a destination is not here; `redirection.ts` says why.
   */
  readonly redirectedSubmissions: readonly RedirectedSubmission[]
  /**
   * Bindings this change points somewhere else — a node that asked one question
   * under a name before and asks a different one under that name after.
   *
   * The other end of the pipe from `redirectedSubmissions`, measured the same
   * way and needing host vocabulary just as little: `loom:data` is the runtime's
   * own key. A node that gains or loses a binding is not here; `repointing.ts`
   * says why, and why a params change counts where a submission has no params
   * to move.
   */
  readonly repointedBindings: readonly RepointedBinding[]
  /**
   * Distance from the root of the shallowest touched position, where the root
   * is 0. A change near the root restructures the page; a change deep in a leaf
   * usually does not.
   */
  readonly shallowestAffectedDepth: number
}

const elementTypesIn = (node: LoomNode): readonly PrimitiveType[] =>
  Array.from(walkTree(node)).flatMap((current) =>
    current.kind === "element" ? [current.type] : []
  )

const nodeCount = (node: LoomNode): number => Array.from(walkTree(node)).length

const depthOf = (root: LoomNode, nodeId: NodeId): number | null => {
  const path = pathToNode(root, nodeId)

  return path ? path.length - 1 : null
}

type Tally = {
  inserted: number
  removed: number
  moved: number
  relocated: number
  configured: number
  shallowest: number
  readonly affected: Set<NodeId>
  readonly types: Set<PrimitiveType>
  readonly removedTypes: Set<PrimitiveType>
  readonly relocatedTypes: Set<PrimitiveType>
  readonly propKeys: Set<string>
  readonly unknown: UnknownPrimitive[]
}

const emptyTally = (): Tally => ({
  inserted: 0,
  removed: 0,
  moved: 0,
  relocated: 0,
  configured: 0,
  shallowest: Number.POSITIVE_INFINITY,
  affected: new Set(),
  types: new Set(),
  removedTypes: new Set(),
  relocatedTypes: new Set(),
  propKeys: new Set(),
  unknown: [],
})

const noteDepth = (tally: Tally, depth: number | null): void => {
  if (depth !== null) tally.shallowest = Math.min(tally.shallowest, depth)
}

const noteSubtree = (tally: Tally, node: LoomNode): void => {
  for (const current of walkTree(node)) tally.affected.add(current.id)
  for (const type of elementTypesIn(node)) tally.types.add(type)
}

const tallyOperation = (
  tally: Tally,
  root: LoomNode,
  operation: TreeOperation,
  isRegistered: PrimitiveVocabulary
): Result<Tally, TreeError> => {
  switch (operation.op) {
    case "insert": {
      const parentDepth = depthOf(root, operation.parentId)
      if (parentDepth === null) return err({ code: "node-not-found", nodeId: operation.parentId })

      tally.inserted += nodeCount(operation.node)
      noteSubtree(tally, operation.node)
      tally.unknown.push(...unknownPrimitivesIn(operation.node, isRegistered))
      noteDepth(tally, parentDepth + 1)

      return ok(tally)
    }

    case "remove": {
      const target = findNode(root, operation.nodeId)
      if (!target) return err({ code: "node-not-found", nodeId: operation.nodeId })

      tally.removed += nodeCount(target)
      noteSubtree(tally, target)
      for (const type of elementTypesIn(target)) tally.removedTypes.add(type)
      noteDepth(tally, depthOf(root, operation.nodeId))

      return ok(tally)
    }

    case "move": {
      const target = findNode(root, operation.nodeId)
      if (!target) return err({ code: "node-not-found", nodeId: operation.nodeId })

      const destinationDepth = depthOf(root, operation.parentId)
      if (destinationDepth === null) return err({ code: "node-not-found", nodeId: operation.parentId })

      tally.moved += 1
      tally.relocated += nodeCount(target)
      tally.affected.add(operation.nodeId)
      for (const type of elementTypesIn(target)) tally.relocatedTypes.add(type)
      noteDepth(tally, depthOf(root, operation.nodeId))
      noteDepth(tally, destinationDepth + 1)

      return ok(tally)
    }

    case "configure": {
      const target = findNode(root, operation.nodeId)
      if (!target) return err({ code: "node-not-found", nodeId: operation.nodeId })

      tally.configured += 1
      tally.affected.add(operation.nodeId)
      if (target.kind === "element") tally.types.add(target.type)
      for (const key of [...Object.keys(operation.set), ...operation.unset]) {
        tally.propKeys.add(key)
      }
      noteDepth(tally, depthOf(root, operation.nodeId))

      return ok(tally)
    }

    default:
      return assertNever(operation, "tallyOperation")
  }
}

/** Two ids name the pair; nothing else about it can differ. */
const pairKey = (nested: NestedTarget): string => `${nested.ancestorId}>${nested.nodeId}`

/**
 * The nested targets this delta is answerable for: the ones in the tree it
 * produces, less the ones already in the tree it started from.
 *
 * The before-walk is skipped when the result has none, which is the ordinary
 * case — a page with no nesting cannot have inherited any.
 */
const introducedNestedTargets = (
  before: LoomNode,
  after: LoomNode,
  isInteractive: InteractivePredicate
): readonly NestedTarget[] => {
  const produced = nestedTargetsIn(after, isInteractive)
  if (produced.length === 0) return produced

  const inherited = new Set(nestedTargetsIn(before, isInteractive).map(pairKey))

  return produced.filter((nested) => !inherited.has(pairKey(nested)))
}

/**
 * The nodes this delta is answerable for leaving unrenderable: the ones whose
 * props fail in the tree it produces, less the ones already failing in the tree
 * it started from.
 *
 * Measured on the two trees rather than on the operations, unlike
 * `unknownPrimitives`, and the difference is forced by what a prop is. A type
 * is fixed when a node is inserted and nothing can change it, so an `insert` is
 * the only operation that can introduce an unknown one. Props are not: a delta
 * may insert a node and configure it, or configure a node another operation in
 * the same delta put there, and only the tree at the end says what the page
 * will actually carry. Measuring the operations would refuse a delta that broke
 * a node and then fixed it in the next breath.
 *
 * Keyed by node id alone, so a node that was already failing and fails
 * differently afterwards counts as inherited. That is deliberate: the page has
 * a hole at that node either way, the change did not put it there, and counting
 * it would refuse the half-repair that is the likeliest way anybody digs such a
 * node back out.
 *
 * The before-walk is skipped when the result has none, which is the ordinary
 * case and — with `EVERY_TYPE_UNDECLARED` — the only case on a deployment that
 * has wired nothing.
 */
const introducedInvalidProps = (
  before: LoomNode,
  after: LoomNode,
  checkProps: PropsVocabulary
): readonly InvalidProps[] => {
  const produced = invalidPropsIn(after, checkProps)
  if (produced.length === 0) return produced

  const inherited = new Set(invalidPropsIn(before, checkProps).map((invalid) => invalid.nodeId))

  return produced.filter((invalid) => !inherited.has(invalid.nodeId))
}

/** Node and name together; a name is only unique within the node that asks it. */
const unreadKey = (unread: UnreadBinding): string => `${unread.nodeId} ${unread.name}`

/**
 * The wasted questions this delta is answerable for: the ones unread in the tree
 * it produces, less the ones already unread in the tree it started from.
 *
 * Keyed on both halves, unlike `introducedInvalidProps` and for the reason the
 * field's own comment gives: two unread names on one node are two round trips,
 * so a change that adds the second inherits the first and answers for the
 * second. `questionsIn` in `repointing.ts` keys the same pair the same way, and
 * for the same reason — a name means nothing without the node asking it.
 *
 * The before-walk is skipped when the result has none, which is the ordinary
 * case and — with `NOTHING_DECLARED` — the only case on a deployment that has
 * handed no reader.
 */
const introducedUnreadBindings = (
  before: LoomNode,
  after: LoomNode,
  reads: BindingReader
): readonly UnreadBinding[] => {
  const produced = unreadBindingsIn(after, reads)
  if (produced.length === 0) return produced

  const inherited = new Set(unreadBindingsIn(before, reads).map(unreadKey))

  return produced.filter((unread) => !inherited.has(unreadKey(unread)))
}

/** Node and name together, for the reason `unreadKey` gives one module over. */
const unplacedKey = (unplaced: UnplacedSlot): string => `${unplaced.nodeId} ${unplaced.name}`

/**
 * The dropped content this delta is answerable for: the regions unplaced in the
 * tree it produces, less the ones already unplaced in the tree it started from.
 *
 * Keyed on both halves, like `introducedUnreadBindings` and unlike
 * `introducedInvalidProps`: a node filling two regions nothing places loses two
 * pieces of content, so a change that adds the second inherits the first and
 * answers for the second.
 *
 * The before-walk is skipped when the result has none, which is the ordinary
 * case and — with `NOTHING_PLACED` — the only case on a deployment that has
 * handed no placer.
 */
const introducedUnplacedSlots = (
  before: LoomNode,
  after: LoomNode,
  places: SlotPlacer
): readonly UnplacedSlot[] => {
  const produced = unplacedSlotsIn(after, places)
  if (produced.length === 0) return produced

  const inherited = new Set(unplacedSlotsIn(before, places).map(unplacedKey))

  return produced.filter((unplaced) => !inherited.has(unplacedKey(unplaced)))
}

/**
 * What a host's primitives are, in the five senses the write path can ask about.
 *
 * Every member is optional and every default is the no-op a deployment that has
 * wired nothing already got, so `analyzeDelta(tree, delta)` measures exactly
 * what it measured before this record existed.
 *
 * **A record rather than trailing parameters, which is a change of shape and
 * not of behaviour.** Until 0250 these were four positional optionals, and the
 * function's own comment had predicted each of the last three arriving to find
 * the shape at its limit. The argument for leaving them positional was that
 * collecting them is a breaking change to a published function; the argument
 * that won is `StakeInput`'s, one module over — *an input that can be left off
 * the end is one that will be* — and a fifth made the order something no caller
 * could hold in their head. There is no middle shape: four positional optionals
 * and a record of the fifth would be the worst of both.
 *
 * The names are the parameters' own, so a caller that passed them positionally
 * reaches the same answers by writing down which one it meant.
 *
 * `| undefined` on each member rather than optionality alone, for
 * `WriteCheckSeams`' reason: a caller holding an `X | undefined` at an optional
 * seam is the ordinary case — `assessChange` is one — and making it rebuild the
 * record to say so would put the presence test in two places.
 */
export type ChangeVocabulary = {
  /** Which primitives render a target, so a target inside one is reachable (0068). */
  readonly isInteractive?: InteractivePredicate | undefined
  /** Which primitive types this deployment can draw at all (0173). */
  readonly isRegistered?: PrimitiveVocabulary | undefined
  /** What each primitive accepts, as its own schema's verdict (0179). */
  readonly checkProps?: PropsVocabulary | undefined
  /** What each primitive reads an answer under (0208). */
  readonly reads?: BindingReader | undefined
  /** What each primitive places a named region for (0250). */
  readonly places?: SlotPlacer | undefined
}

/**
 * Walks the delta forward so each operation is measured against the tree it
 * actually observes — an operation may target a node an earlier operation in
 * the same delta inserted.
 *
 * The vocabularies arrive as one optional record (`ChangeVocabulary`, above).
 * What keeps any of them from being forgotten is unchanged by that: `assessChange`
 * is still the only caller that assembles them, and it still does it in one
 * expression.
 */
export const analyzeDelta = (
  tree: LoomTree,
  delta: TreeDelta,
  vocabulary: ChangeVocabulary = {}
): Result<ChangeAnalysis, TreeError> => {
  const {
    isInteractive = NOTHING_INTERACTIVE,
    isRegistered = EVERY_TYPE_REGISTERED,
    checkProps = EVERY_TYPE_UNDECLARED,
    reads = NOTHING_DECLARED,
    places = NOTHING_PLACED,
  } = vocabulary

  const tally = emptyTally()
  let state: LoomNode = tree.root

  for (const operation of delta.operations) {
    const tallied = tallyOperation(tally, state, operation, isRegistered)
    if (!tallied.ok) return tallied

    const advanced = applyOperation(state, operation)
    if (!advanced.ok) return advanced

    state = advanced.value
  }

  return ok({
    operationCount: delta.operations.length,
    insertedNodeCount: tally.inserted,
    removedNodeCount: tally.removed,
    movedNodeCount: tally.moved,
    configuredNodeCount: tally.configured,
    relocatedNodeCount: tally.relocated,
    affectedNodeIds: Array.from(tally.affected),
    touchedPrimitiveTypes: Array.from(tally.types),
    removedPrimitiveTypes: Array.from(tally.removedTypes),
    relocatedPrimitiveTypes: Array.from(tally.relocatedTypes),
    configuredPropKeys: Array.from(tally.propKeys),
    nestedTargets: introducedNestedTargets(tree.root, state, isInteractive),
    unknownPrimitives: tally.unknown,
    invalidProps: introducedInvalidProps(tree.root, state, checkProps),
    unreadBindings: introducedUnreadBindings(tree.root, state, reads),
    unplacedSlots: introducedUnplacedSlots(tree.root, state, places),
    redirectedSubmissions: redirectedSubmissionsBetween(tree.root, state),
    repointedBindings: repointedBindingsBetween(tree.root, state),
    shallowestAffectedDepth: Number.isFinite(tally.shallowest) ? tally.shallowest : 0,
  })
}
