import type { NodeId } from "../ids.js"
import { assertNever, ok, type Result } from "../result.js"
import type { TreeDelta, TreeOperation } from "../tree/delta.js"
import { walkTree } from "../tree/navigation.js"
import type { LoomTree } from "../tree/tree.js"

import type { StoreError } from "./errors.js"
import type { StoredRevision, TreeReader } from "./store.js"

/**
 * Who put this node here.
 *
 * The log already answers it — every entry carries the provenance that produced
 * it (0016) — but only per revision. A reviewer looking at a tree is not asking
 * "what happened at revision 12", they are pointing at one node and asking who
 * asked for it and who wrote it. Nothing joined those two readings, so a change
 * was attributable in the aggregate and anonymous at the place you would
 * actually query it.
 *
 * This module makes that join without storing anything. A node carries no
 * authorship field and the tree schema is untouched: attribution is derived from
 * the log the same way `identity.ts` derives id history (0038), because a fact
 * the log already determines does not belong in the document as well — two
 * copies of one fact is one fact and one opportunity to disagree.
 *
 * **The walk goes backwards, and stops.** For a node that is in the tree now,
 * the first insert carrying it that a backwards walk meets *is* the one that put
 * it there: anything that removed it afterwards would need a later insert to
 * bring it back, and that later insert is the one the walk would have met first.
 * So attribution costs a bounded read from the newest end of the log rather than
 * a fold over all of it, and a recently placed node is answered by one page.
 */

/** What a revision did to a node that was already in the tree. */
export type NodeChange = "configured" | "moved"

/** What a revision did to a node that is in the tree now. */
export type NodeEffect = "placed" | NodeChange

/**
 * One revision that touched one node, and the whole entry it came from.
 *
 * The entry is carried rather than copied out field by field. A touch is a
 * pointer into the log, and restating the provenance, the approver and the
 * proposal id here would be a second copy of a record that is already the truth
 * — free to drift, and no more readable.
 */
export type NodeTouch<Effect extends NodeEffect = NodeEffect> = {
  readonly effect: Effect
  /**
   * Whether the operation named this node, as opposed to carrying it in.
   *
   * An insert brings a whole subtree, so every node in it was placed by that
   * revision — but only the subtree's root was asked for. "The model added a
   * card" and "the model added the heading inside the card it added" are
   * different sentences, and a reviewer deserves the one that is true.
   */
  readonly named: boolean
  readonly entry: StoredRevision
}

/**
 * What is known about how a node came to be in the tree.
 *
 * Three outcomes rather than two, because "no revision placed this" and "we
 * stopped looking" are different facts and only one of them is about the tree.
 * A bounded read that reported the second as the first would credit the seed
 * with work somebody did.
 */
export type NodeAttribution =
  | {
      readonly outcome: "placed"
      readonly nodeId: NodeId
      readonly placed: NodeTouch
      /**
       * Every touch since it was placed, oldest first. Never a placement: the
       * walk stops at the one that put the node here, so anything it collected
       * on the way changed a node that was already there.
       */
      readonly since: readonly NodeTouch<NodeChange>[]
    }
  /** The walk reached the start of the log without finding a placement. */
  | {
      readonly outcome: "seeded"
      readonly nodeId: NodeId
      readonly since: readonly NodeTouch<NodeChange>[]
    }
  /** The walk ran out of budget first. `since` is what it saw, not all there is. */
  | {
      readonly outcome: "undetermined"
      readonly nodeId: NodeId
      readonly since: readonly NodeTouch<NodeChange>[]
    }

export type TreeAttribution = {
  readonly nodes: ReadonlyMap<NodeId, NodeAttribution>
  /**
   * The oldest revision the walk read, or null when it read none.
   *
   * Reported once here rather than on every `undetermined` node, because it is a
   * fact about the read and not about any node. It is also the only thing that
   * makes an `undetermined` actionable: the node was placed at or before this.
   */
  readonly examinedTo: number | null
  /** True when the walk saw the whole log, which is what turns unplaced into seeded. */
  readonly reachedStart: boolean
}

export type AttributionRequest = {
  /**
   * How many pages of log to read before giving up on whatever is still
   * unattributed. Every read in Loom is bounded and this one is no exception; a
   * tree edited for long enough has a history no request path should fold.
   */
  readonly pages?: number
}

/**
 * Five pages, which at the store's default page size is five hundred revisions.
 *
 * Chosen to cover the whole log of any tree in a portal today while still being
 * a bound. The walk stops as soon as every node is accounted for, so this is the
 * cost of a tree with genuinely ancient nodes, not the usual cost.
 */
export const DEFAULT_ATTRIBUTION_PAGES = 5

type NodeEffectAt = {
  readonly nodeId: NodeId
  readonly effect: NodeEffect
  readonly named: boolean
}

const isPlacement = (effect: NodeEffect): effect is "placed" => effect === "placed"

/**
 * Every node one operation touched, read from the operation alone.
 *
 * No tree state is consulted, and none is needed: an insert carries the subtree
 * it is inserting, and the other three name their node. That is what keeps this
 * function pure and the walk cheap.
 *
 * A `remove` yields nothing, and that is not an omission. This attributes nodes
 * that are in the tree now, and a backwards walk stops at a live node's
 * placement — so a removal of that node is always older than the insert that
 * brought it back, and is never reached. A node the removal took for good is not
 * in the tree being attributed at all.
 */
const effectsOf = (operation: TreeOperation): readonly NodeEffectAt[] => {
  switch (operation.op) {
    case "insert":
      return Array.from(walkTree(operation.node), (node) => ({
        nodeId: node.id,
        effect: "placed" as const,
        named: node.id === operation.node.id,
      }))
    case "configure":
      return [{ nodeId: operation.nodeId, effect: "configured", named: true }]
    case "move":
      return [{ nodeId: operation.nodeId, effect: "moved", named: true }]
    case "remove":
      return []
    default:
      return assertNever(operation, "effectsOf")
  }
}

const effectsIn = (delta: TreeDelta): readonly NodeEffectAt[] =>
  delta.operations.flatMap(effectsOf)

/** Mutable while the walk runs; frozen into a `NodeAttribution` when it ends. */
type Pending = {
  placed: NodeTouch | undefined
  /** Newest first while walking, reversed on the way out. */
  since: NodeTouch<NodeChange>[]
}

const attributionOf = (
  nodeId: NodeId,
  pending: Pending,
  reachedStart: boolean
): NodeAttribution => {
  const since = [...pending.since].reverse()

  if (pending.placed) return { outcome: "placed", nodeId, placed: pending.placed, since }

  return reachedStart
    ? { outcome: "seeded", nodeId, since }
    : { outcome: "undetermined", nodeId, since }
}

/**
 * Attributes every node in a tree, walking that tree's log backwards.
 *
 * Takes the tree rather than a tree id on purpose. The caller already has the
 * tree it is describing — a portal has the one it rendered — and reading `head`
 * again here could return a revision that arrived in between, so the attribution
 * would describe nodes the caller is not showing. The same reasoning
 * `auditSnapshot` uses when it reports both trees rather than making its caller
 * re-read one.
 */
export const attributeTree = async (
  reader: TreeReader,
  tree: LoomTree,
  request: AttributionRequest = {}
): Promise<Result<TreeAttribution, StoreError>> => {
  const budget = request.pages ?? DEFAULT_ATTRIBUTION_PAGES
  const pending = new Map<NodeId, Pending>(
    Array.from(walkTree(tree.root), (node) => [node.id, { placed: undefined, since: [] }])
  )

  let unplaced = pending.size
  let examinedTo: number | null = null
  let reachedStart = false
  let cursor: string | undefined

  for (let page = 0; page < budget && unplaced > 0; page += 1) {
    const read = await reader.revisions(tree.treeId, {
      direction: "older",
      ...(cursor === undefined ? {} : { cursor }),
    })

    if (!read.ok) return read

    /**
     * A page is always ascending by revision whichever end it came from, so
     * walking it backwards is what puts the whole read in newest-first order.
     */
    for (const entry of [...read.value.revisions].reverse()) {
      /**
       * The log may have moved since the caller read its tree. Attributing a
       * revision the caller's tree does not contain would credit a node with a
       * placement that has not happened as far as anything on screen is
       * concerned — so the walk describes the log *as of* this tree.
       */
      if (entry.revision > tree.revision) continue

      examinedTo = entry.revision

      for (const { nodeId, effect, named } of effectsIn(entry.delta)) {
        const found = pending.get(nodeId)

        /** Already placed, or not a node this tree holds: either way, done with it. */
        if (!found || found.placed) continue

        if (isPlacement(effect)) {
          found.placed = { effect, named, entry }
          unplaced -= 1
        } else {
          found.since.push({ effect, named, entry })
        }
      }
    }

    if (read.value.older === null) {
      reachedStart = true
      break
    }

    cursor = read.value.older
  }

  return ok({
    nodes: new Map(
      Array.from(pending, ([nodeId, found]) => [nodeId, attributionOf(nodeId, found, reachedStart)])
    ),
    examinedTo,
    reachedStart,
  })
}
