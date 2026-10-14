import type { NodeId, TreeId } from "../ids.js"
import type { JsonObject, JsonValue } from "../json.js"
import { err, ok, reduceResult, type Result } from "../result.js"
import type { DiscardedWork } from "../runtime/proposal.js"
import { applyOperation } from "../tree/apply.js"
import { compareTrees, type NodeFacet, type TreeDifference } from "../tree/compare.js"
import { configurationOf } from "../tree/configuration.js"
import type { TreeOperation } from "../tree/delta.js"
import type { TreeError } from "../tree/errors.js"
import { namedNodeIds } from "../tree/naming.js"
import { collectNodeIds, findNode } from "../tree/navigation.js"
import { isContainerNode, type ElementNode, type LoomNode } from "../tree/node.js"
import { withRoot, type LoomTree } from "../tree/tree.js"

import type { StoreError } from "./errors.js"
import type { StoredRevision, TreeReader } from "./store.js"

/**
 * Planning a reseed: what it would take to put a stored page back to the shape
 * its builder produces now.
 *
 * 0259 made this site's pages rows in the store, and seeding is deliberately
 * create-if-absent — a page that exists has a history and a deploy that
 * re-seeded over the top would throw it away on every release. The consequence
 * `Loom portal` filed on 12 October is the one worth planning for: **once a page
 * is in the store, editing its builder stops changing the site, and there was no
 * supported way back.** A deployment in that position could append its way to
 * the shape it wanted or open a SQL client.
 *
 * `TreeStore` gains nothing here, and that is the decision rather than an
 * omission. A store whose rows are the audit trail has a good reason not to
 * offer a delete: *the row is gone* is a worse answer than *the row says it was
 * replaced*. So going back is a **change like any other** — operations against a
 * known base revision, carrying provenance, judged by the Gate, invertible, and
 * written into the log where it says what happened on the day it happened.
 *
 * ## This module decides nothing
 *
 * It is `revert.ts`'s sibling and has the same manners: it produces the
 * operations and the obstacles, and the Gate judges. A revert undoes one entry
 * in the log; a reseed carries the whole page to a tree somebody else built.
 * Neither writes.
 *
 * ## Why the four operations are enough
 *
 * A reseed looks like it wants the whole-tree replacement 0009 deliberately
 * refused. It does not, because node ids are minted once (0003) and are the join
 * key between the two trees: a builder is pure and its id factory is
 * deterministic, so the authored tree names the same nodes the stored one does.
 * That turns a diff into a set join and a position pass — no structural
 * alignment, no heuristics — and every operation it emits is one the Gate can
 * read on its own.
 *
 * `configure` reaching a text node's `value` and a slot's `name` is what makes
 * this exact rather than nearly exact. A builder whose headline changed produces
 * a text node with the same id and a new value, which is the most likely reseed
 * there is; without a settable `value` it would have needed the id back as a
 * different node, and 0038 is the reason that is refused.
 *
 * ## The plan checks itself
 *
 * Every operation is planned against a simulation of the tree it will be applied
 * to, and the simulation is compared to the authored tree at the end. A plan that
 * did not land is reported as `unexpressible` rather than returned as a good one.
 * So the two facets `configure` cannot reach — a node's kind, and an element's
 * primitive — do not need enumerating twice: they are refused up front for a
 * precise answer, and the comparison is what makes that list impossible to get
 * wrong.
 *
 * `compareTrees` is the description and is still never a recipe (0016). Here it
 * decides what the recipe may attempt and then proves that it worked, which is
 * the one direction between the two that cannot put an entry in the log nobody
 * proposed.
 */

/**
 * A node the authored tree names and the stored page no longer holds.
 *
 * The plan reports these rather than ruling on them, for `discards`' reason
 * (0035): an insert under an id the log once retired is `restored` if the node
 * that comes back is the node that left and `recycled` if it is not, and only
 * the log can tell those apart — `idReturnsIn` is what answers it, and the
 * answer is the audit's rather than this plan's. A caller that cares asks there;
 * the Gate decides what a reseed that revives an address is worth.
 */
export type NodeRevival = {
  readonly nodeId: NodeId
  readonly label: string
}

/** A node the stored page holds that the authored tree does not, so the reseed removes it. */
export type NodeRetirement = {
  readonly nodeId: NodeId
  readonly label: string
}

/** Why the authored tree is not a build of the stored page at all. */
export type PageMismatch =
  | { readonly facet: "treeId"; readonly stored: TreeId; readonly authored: TreeId }
  /** The root is neither detachable nor insertable, so two roots are two pages. */
  | { readonly facet: "rootId"; readonly stored: NodeId; readonly authored: NodeId }

export type ReseedPlan =
  /**
   * The stored page is already the authored one, so there is nothing to propose.
   * Its own outcome rather than an empty operation list, because a delta carries
   * at least one operation (0009) and a caller that appended an empty one would
   * put a revision in the log that changed nothing.
   */
  | { readonly outcome: "already-authored"; readonly headRevision: number }
  | {
      readonly outcome: "reseedable"
      /**
       * The reseed, as operations. They become a delta when something proposes
       * them; the id and base revision belong to that delta, not to this plan.
       */
      readonly operations: readonly TreeOperation[]
      /** The head these operations were planned against. */
      readonly headRevision: number
      readonly revives: readonly NodeRevival[]
      /** What the reseed writes over — the changes since seeding that it undoes. */
      readonly retires: readonly NodeRetirement[]
    }
  | { readonly outcome: "different-page"; readonly mismatch: PageMismatch }
  /**
   * Some difference between the two trees is not expressible in the four
   * operations, so no reseed can be proposed. Carries every difference that
   * stands in the way, named and labelled, which is the half a deployment can
   * act on: the authored tree has to change, or the page does.
   */
  | { readonly outcome: "unexpressible"; readonly blocking: readonly TreeDifference[] }
  /**
   * An operation this module planned was refused by the tree it was planned
   * against. Nothing a caller did wrong and nothing it can fix — a bug here,
   * reported as a value so it surfaces as a refusal rather than a wrong page.
   */
  | {
      readonly outcome: "unplannable"
      readonly operation: TreeOperation
      readonly error: TreeError
    }

export type UnreseedablePlan = Exclude<ReseedPlan, { readonly outcome: "reseedable" }>

/**
 * The facets a `configure` cannot reach, so no plan can close them.
 *
 * A node's `kind` and an element's primitive `type` are what a node *is*, and
 * changing either at a stable id would be a different node wearing the address —
 * which is the case 0038 exists to refuse, not one to work around by removing
 * and re-inserting. `name` and `text` are absent on purpose: both are settable
 * (`configurationOf` exposes one key for each), which is what keeps a reseed
 * exact.
 *
 * **The comparison at the end of the plan is what enforces this**, not a filter
 * over this list: a facet nothing can close survives every pass and is still
 * there to be reported. The list is the sentence a reader needs, and
 * `reseed.test.ts` checks it against `NODE_FACETS` so a sixth facet cannot be
 * left out of it.
 */
export const UNRESEEDABLE_FACETS: readonly NodeFacet[] = ["kind", "type"]

/**
 * One of the two is refused before anything is planned, and only one.
 *
 * A changed `kind` is the case where attempting the repair reports the wrong
 * thing: the two kinds expose different configuration keys, so the patch names a
 * key the node has not got and the plan comes back `unplannable` with an
 * `unconfigurable-key` — a sentence about a patch, where a deployment needs one
 * about a node. A changed `type` needs no such help: nothing in any pass touches
 * a primitive, so the difference is still standing at the end and the comparison
 * names it exactly.
 */
const differentKinds = (authored: LoomTree, stored: LoomTree): readonly TreeDifference[] =>
  compareTrees(authored, stored).filter(
    (difference) => difference.code === "changed" && difference.facets.includes("kind")
  )

const isElement = (node: LoomNode): node is ElementNode => node.kind === "element"

/**
 * The tree as the plan has left it so far, and the operations that got it there.
 *
 * The root is an element at every step, which is the same invariant `applyDelta`
 * keeps and for the same reason: a document always has a container, and nothing
 * this module plans can take that away — the root is neither removable nor
 * movable and `configure` never changes a node's kind. `advance` re-establishes
 * it per operation rather than asserting it once, so a plan that somehow lost it
 * is a refusal instead of a wrong page.
 */
type Working = {
  readonly root: ElementNode
  readonly operations: readonly TreeOperation[]
}

/** An operation the tree it was planned against refused. */
type Stumble = {
  readonly operation: TreeOperation
  readonly error: TreeError
}

const advance = (working: Working, operation: TreeOperation): Result<Working, Stumble> => {
  const applied = applyOperation(working.root, operation)
  if (!applied.ok) return err({ operation, error: applied.error })

  return isElement(applied.value)
    ? ok({ root: applied.value, operations: [...working.operations, operation] })
    : err({
        operation,
        error: {
          code: "schema-violation",
          path: "root",
          detail: `root became a ${applied.value.kind} node`,
        },
      })
}

const advanceAll = (
  working: Working,
  operations: readonly TreeOperation[]
): Result<Working, Stumble> => reduceResult(operations, working, advance)

const childrenOf = (node: LoomNode): readonly LoomNode[] =>
  isContainerNode(node) ? node.children : []

const childrenAt = (root: LoomNode, nodeId: NodeId): readonly LoomNode[] => {
  const found = findNode(root, nodeId)

  return found === null ? [] : childrenOf(found)
}

/**
 * The topmost nodes the authored tree does not name, which are the only ones
 * worth removing: a `remove` takes the whole subtree, and naming a node under
 * one already removed would be a second operation against a node that is gone.
 */
const strangersIn = (node: LoomNode, authored: ReadonlySet<NodeId>): readonly NodeId[] =>
  authored.has(node.id)
    ? childrenOf(node).flatMap((child) => strangersIn(child, authored))
    : [node.id]

const removals = (stored: LoomNode, authored: LoomTree): readonly TreeOperation[] =>
  strangersIn(stored, new Set(collectNodeIds(authored.root))).map((nodeId) => ({
    op: "remove",
    nodeId,
  }))

const withoutChildren = (node: LoomNode): LoomNode =>
  isContainerNode(node) ? { ...node, children: [] } : node

/** Whether any node under this one — not counting itself — is already in the stored page. */
const holdsStored = (node: LoomNode, stored: ReadonlySet<NodeId>): boolean =>
  childrenOf(node).some(
    (child) => stored.has(child.id) || holdsStored(child, stored)
  )

/**
 * Put back every node the authored tree names and the stored page lacks, parents
 * before children.
 *
 * A subtree with nothing of the stored page under it goes in whole, which is one
 * operation for a card somebody deleted and is what a reviewer wants to read. A
 * subtree that holds a node the page still has somewhere else goes in as a shell
 * and its children are brought home by the claiming pass — inserting it whole
 * would name an id twice and be refused.
 *
 * The index is clamped to the live child list, which is usually shorter than the
 * authored one at this point. Nothing is lost by that: the pass after this one
 * puts every child of every container in its authored position.
 */
const insertAbsent = (
  working: Working,
  authored: LoomNode,
  parentId: NodeId | undefined,
  index: number,
  stored: ReadonlySet<NodeId>
): Result<Working, Stumble> => {
  const absent = parentId !== undefined && !stored.has(authored.id)
  const whole = absent && !holdsStored(authored, stored)

  const placed: Result<Working, Stumble> =
    parentId === undefined || !absent
      ? ok(working)
      : advance(working, {
          op: "insert",
          parentId,
          index: Math.min(index, childrenAt(working.root, parentId).length),
          node: whole ? authored : withoutChildren(authored),
        })

  if (!placed.ok || whole) return placed

  return reduceResult(childrenOf(authored), placed.value, (carried, child, at) =>
    insertAbsent(carried, child, authored.id, at, stored)
  )
}

/**
 * Walk the authored tree, parents before children, doing one thing at each node.
 *
 * Top-down is what makes the two passes below correct rather than merely
 * convergent, and the argument is the same for both: when a container is
 * reached, every authored ancestor of it has already been put where the authored
 * tree has it, so the container is not sitting inside one of its own authored
 * children. A `move` that would be refused as going into a descendant therefore
 * cannot be planned.
 */
const descending = (
  working: Working,
  authored: LoomNode,
  at: (carried: Working, node: LoomNode) => Result<Working, Stumble>
): Result<Working, Stumble> => {
  const here = at(working, authored)
  if (!here.ok) return here

  return reduceResult(childrenOf(authored), here.value, (carried, child) =>
    descending(carried, child, at)
  )
}

/**
 * Move in every child the authored tree gives this container and the stored page
 * put somewhere else.
 *
 * Position is not settled here, deliberately. A container still holding a child
 * that belongs deeper in the tree has one more child than the authored list, and
 * ordering against that list would move a node to make room for one that is
 * about to leave — two operations where the second was never needed. So this
 * pass only ever puts a node under the parent that should have it, and the pass
 * after it, by which time every container holds exactly its authored children,
 * is the only one that moves anything for position's sake.
 */
const claiming = (working: Working, authored: LoomNode): Result<Working, Stumble> => {
  const held = childrenAt(working.root, authored.id)

  return reduceResult(childrenOf(authored), working, (carried, child, index) =>
    held.some((live) => live.id === child.id)
      ? ok(carried)
      : advance(carried, {
          op: "move",
          nodeId: child.id,
          parentId: authored.id,
          index: Math.min(index, childrenAt(carried.root, authored.id).length),
        })
  )
}

/**
 * Put one container's children in the order the authored tree gives them.
 *
 * Left to right, moving whichever child belongs at a position that does not hold
 * it. A `move` is a detach followed by an insert (0009), so by the time position
 * `index` is settled the positions before it are correct and the list is at least
 * `index` long — the index this names is always in range.
 */
const ordering = (working: Working, authored: LoomNode): Result<Working, Stumble> =>
  reduceResult(childrenOf(authored), working, (carried, child, index) =>
    childrenAt(carried.root, authored.id)[index]?.id === child.id
      ? ok(carried)
      : advance(carried, { op: "move", nodeId: child.id, parentId: authored.id, index })
  )

const patchFor = (
  stored: JsonObject,
  authored: JsonObject
): { readonly set: JsonObject; readonly unset: readonly string[] } => {
  const set = Object.fromEntries(
    Object.entries(authored).filter(
      ([key, value]) => JSON.stringify(stored[key]) !== JSON.stringify(value)
    )
  ) as Record<string, JsonValue>

  return {
    set,
    unset: Object.keys(stored).filter((key) => !(key in authored)),
  }
}

/**
 * Set every node's configuration back to the authored one — props for an
 * element, the value for a text node, the name for a slot.
 *
 * One `configure` per node that differs, keyed by the id both trees share.
 * Nothing inserted above needs one: a node that went in carried the authored
 * configuration with it.
 */
const configuring = (working: Working, authored: LoomNode): Result<Working, Stumble> => {
  const found = findNode(working.root, authored.id)
  if (found === null) return ok(working)

  const patch = patchFor(configurationOf(found), configurationOf(authored))

  return Object.keys(patch.set).length === 0 && patch.unset.length === 0
    ? ok(working)
    : advance(working, { op: "configure", nodeId: authored.id, ...patch })
}

const revivalsIn = (authored: LoomTree, stored: LoomTree): readonly NodeRevival[] => {
  const held = new Set(collectNodeIds(stored.root))

  return compareTrees(authored, stored)
    .filter((difference) => difference.code === "missing" && !held.has(difference.nodeId))
    .map(({ nodeId, label }) => ({ nodeId, label }))
}

const retirementsIn = (authored: LoomTree, stored: LoomTree): readonly NodeRetirement[] =>
  compareTrees(authored, stored)
    .filter((difference) => difference.code === "extra")
    .map(({ nodeId, label }) => ({ nodeId, label }))

const planned = (stored: LoomTree, authored: LoomTree): Result<Working, Stumble> => {
  const start: Working = { root: stored.root, operations: [] }
  const held = new Set(collectNodeIds(stored.root))

  const cleared = advanceAll(start, removals(stored.root, authored))
  if (!cleared.ok) return cleared

  const filled = insertAbsent(cleared.value, authored.root, undefined, 0, held)
  if (!filled.ok) return filled

  const claimed = descending(filled.value, authored.root, claiming)
  if (!claimed.ok) return claimed

  const ordered = descending(claimed.value, authored.root, ordering)
  if (!ordered.ok) return ordered

  return descending(ordered.value, authored.root, configuring)
}

/**
 * What it would take to carry a stored page to the tree its builder produces now.
 *
 * `stored` is the head of the page in the store; `authored` is a fresh build. The
 * two must be the same page — the same tree id and the same root — because a root
 * can be neither removed nor moved (0009), so there is no operation that turns one
 * root into another.
 *
 * Pure, and it reads no log: both trees are in the caller's hand already, and the
 * one question that needs the log — whether an id this plan revives was retired as
 * the node that is coming back — is `idReturnsIn`'s and travels on `revives` for
 * the Gate rather than being answered here.
 */
export const planReseed = (stored: LoomTree, authored: LoomTree): ReseedPlan => {
  if (stored.treeId !== authored.treeId) {
    return {
      outcome: "different-page",
      mismatch: { facet: "treeId", stored: stored.treeId, authored: authored.treeId },
    }
  }

  if (stored.root.id !== authored.root.id) {
    return {
      outcome: "different-page",
      mismatch: { facet: "rootId", stored: stored.root.id, authored: authored.root.id },
    }
  }

  const mixedKinds = differentKinds(authored, stored)
  if (mixedKinds.length > 0) return { outcome: "unexpressible", blocking: mixedKinds }

  if (compareTrees(authored, stored).length === 0) {
    return { outcome: "already-authored", headRevision: stored.revision }
  }

  const plan = planned(stored, authored)
  if (!plan.ok) {
    return { outcome: "unplannable", operation: plan.error.operation, error: plan.error.error }
  }

  const remaining = compareTrees(authored, withRoot(stored, plan.value.root))
  if (remaining.length > 0) return { outcome: "unexpressible", blocking: remaining }

  return plan.value.operations.length === 0
    ? { outcome: "already-authored", headRevision: stored.revision }
    : {
        outcome: "reseedable",
        operations: plan.value.operations,
        headRevision: stored.revision,
        revives: revivalsIn(authored, stored),
        retires: retirementsIn(authored, stored),
      }
}

const countOf = (count: number, noun: string): string =>
  `${count} ${noun}${count === 1 ? "" : "s"}`

export const describeReseedPlan = (plan: ReseedPlan): string => {
  switch (plan.outcome) {
    case "already-authored":
      return `revision ${plan.headRevision} is the page the builder produces`
    case "reseedable":
      return `${countOf(plan.operations.length, "operation")} would put the page back at head ${
        plan.headRevision
      }${plan.retires.length === 0 ? "" : `, removing ${countOf(plan.retires.length, "node")}`}${
        plan.revives.length === 0 ? "" : `, reviving ${countOf(plan.revives.length, "id")}`
      }`
    case "different-page":
      return `${plan.mismatch.facet} ${plan.mismatch.stored} is not ${plan.mismatch.authored}`
    case "unexpressible":
      return `${countOf(plan.blocking.length, "difference")} no operation can close: ${plan.blocking
        .map((difference) => `${difference.label} (${difference.nodeId})`)
        .join(", ")}`
    case "unplannable":
      return `a planned ${plan.operation.op} was refused: ${plan.error.code}`
  }
}

/**
 * What a reseed writes over: every entry in the log that touched a node the
 * reseed is about to change.
 *
 * `planReseed` is pure and reads no log, which is right — it answers *can this
 * page be carried back*, and two trees are enough to answer it. This answers the
 * separate question the Gate needs: *whose work does carrying it back destroy*.
 *
 * It matters because of what the declaration buys. 0035 made discarded work a
 * rule in the Gate rather than a level — a change that writes over work already
 * in the log is never applied without a person, whatever latitude its origin
 * has. So a reseed that declares its discards is **held for confirmation** by
 * construction, and a reseed over a page nobody has edited since it was seeded
 * declares nothing and applies straight through. That is the whole of the
 * question `Loom marketing` filed as *who presses it*, answered by the Gate
 * instead of by a new switch.
 *
 * Which makes the absence of this function the dangerous state rather than a
 * missing nicety: a caller that proposed a reseed without it would be asking the
 * Gate to weigh a change whose cost it declared nothing about, and 0035 is
 * explicit that absence means *nobody looked at a log* rather than *the log was
 * clean*. The proposal would have been auto-applied over somebody's accepted
 * edit.
 *
 * Every entry is a candidate. There is no seed revision to skip past, unlike
 * `planRevert`'s walk: revision 0 is the `create` and carries no delta, so every
 * entry in the log is a change somebody accepted after the page was seeded.
 */
export type ReseedDiscardsRequest = {
  readonly treeId: TreeId
  /**
   * The reseed's own operations, as `planReseed` produced them.
   *
   * The operations rather than the plan's `revives` and `retires`, because
   * `namedNodeIds` already reaches every node any of the four operations names —
   * so a reseed that only reconfigures a headline, naming no revival and no
   * retirement, still declares the revision that last wrote that headline.
   * Taking the two lists instead would have missed exactly the commonest reseed
   * there is.
   */
  readonly operations: readonly TreeOperation[]
}

const overlapIn = (
  entry: StoredRevision,
  reseeding: ReadonlySet<NodeId>
): DiscardedWork | null => {
  const overlap = namedNodeIds(entry.delta.operations).filter((nodeId) => reseeding.has(nodeId))

  return overlap.length === 0 ? null : { revision: entry.revision, nodeIds: overlap }
}

const walkForDiscards = async (
  reader: TreeReader,
  treeId: TreeId,
  reseeding: ReadonlySet<NodeId>,
  found: readonly DiscardedWork[],
  cursor?: string
): Promise<Result<readonly DiscardedWork[], StoreError>> => {
  const page = await reader.revisions(treeId, cursor === undefined ? {} : { cursor })
  if (!page.ok) return page

  const walked = page.value.revisions.reduce<readonly DiscardedWork[]>((current, entry) => {
    const discarded = overlapIn(entry, reseeding)

    return discarded === null ? current : [...current, discarded]
  }, found)

  return page.value.newer === null
    ? ok(walked)
    : await walkForDiscards(reader, treeId, reseeding, walked, page.value.newer)
}

/**
 * Reads the whole log once and reports the entries a reseed would write over.
 *
 * Ascending by revision, because `DiscardedWork` is read by a person answering a
 * hold (0019) and *revisions 3, 7 and 8* is the sentence they can check against
 * the history screen beside it.
 *
 * The walk is the whole log rather than a window, and that is the honest cost: a
 * reseed's reach is every node it names, and a change from the page's first week
 * is as discarded as one from this morning. It is the same walk `planRevert`
 * takes and it is paid once per reseed, which is an operation a person presses.
 *
 * A `StoreError` means the log could not be read, so nothing is known about the
 * cost — and a caller must not then propose the reseed with an empty
 * declaration, which would read as *the log was clean*.
 */
export const reseedDiscards = async (
  reader: TreeReader,
  request: ReseedDiscardsRequest
): Promise<Result<readonly DiscardedWork[], StoreError>> => {
  const reseeding = new Set(namedNodeIds(request.operations))

  return reseeding.size === 0
    ? ok([])
    : await walkForDiscards(reader, request.treeId, reseeding, [])
}
