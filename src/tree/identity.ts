import type { NodeId } from "../ids.js"
import { assertNever } from "../result.js"

import { nodeLabel, type LoomNode } from "./node.js"
import { walkTree } from "./navigation.js"
import type { LoomTree } from "./tree.js"

/**
 * Whether an id still names one thing.
 *
 * 0001 makes the id the address of a node for the life of the tree, and 0028
 * leans on that when it joins two trees by id to say how they differ. Both read
 * as facts and neither was checked. What is actually enforced is narrower: a
 * delta may not insert an id the *live tree* already holds. An id that has been
 * removed is not in the live tree, so nothing stops a later insert minting a
 * fresh node onto it — and then `n_4` is a card at revision 3 and a paragraph at
 * revision 9, and every reader that joins by id across the log is silently
 * conflating two nodes.
 *
 * Reuse is not always wrong, which is what makes this worth doing carefully. An
 * undo of a `remove` re-inserts the exact node that was removed (`inverse.ts`),
 * and undo is a first-class operation (0032, 0035). A rule that forbade an id
 * from ever returning would forbid taking a removal back. So the question is
 * never "did this id return" but "did it return as the node that left".
 *
 * This module answers that by reading a tree's history. It stores nothing and
 * changes nothing: it is handed each consecutive pair of states a fold already
 * produces, and it reports. Enforcement across a log would need the tree to
 * carry the ids it has retired, which is a schema change — see 0038.
 */

/**
 * A node's shape, ids included, at one moment.
 *
 * Ids are part of the fingerprint on purpose. The question is whether the node
 * that returned *is* the node that left, not whether it resembles it: a subtree
 * rebuilt with fresh children under a retired parent id is a new node wearing an
 * old address, and that is exactly the case worth reporting.
 *
 * Props are compared by serialisation, which is order-sensitive — the same
 * choice `compareTrees` makes and for the same reason: a props bag is rewritten
 * wholesale (0009), so two orderings came from two different writes.
 */
export const nodeFingerprint = (node: LoomNode): string => {
  switch (node.kind) {
    case "element":
      return `element ${node.id} ${node.type} ${JSON.stringify(node.props)} [${node.children
        .map(nodeFingerprint)
        .join(" ")}]`
    case "slot":
      return `slot ${node.id} ${node.name} [${node.children.map(nodeFingerprint).join(" ")}]`
    case "text":
      return `text ${node.id} ${JSON.stringify(node.value)}`
    default:
      return assertNever(node, "nodeFingerprint")
  }
}

/** Who was living at an id, and what a reader would call them. */
export type Occupant = {
  readonly label: string
  readonly fingerprint: string
}

const occupantOf = (node: LoomNode): Occupant => ({
  label: nodeLabel(node),
  fingerprint: nodeFingerprint(node),
})

/**
 * One unbroken stretch of an id being present in the tree.
 *
 * A node that is configured while resident keeps one tenancy: it never left, so
 * nothing about its identity is in doubt. `entered` is therefore the shape it
 * arrived with and not necessarily its shape now, which is all the comparison
 * needs — the pairing that matters is the shape it *left* with against the shape
 * the next arrival brought.
 */
export type IdTenancy = {
  readonly enteredAt: number
  readonly entered: Occupant
  /** null while the node is still in the tree. */
  readonly leftAt: number | null
  readonly left: Occupant | null
}

/** Every stretch every id has had, oldest first. */
export type IdHistory = ReadonlyMap<NodeId, readonly IdTenancy[]>

const occupantsOf = (tree: LoomTree): ReadonlyMap<NodeId, Occupant> =>
  new Map(Array.from(walkTree(tree.root), (node) => [node.id, occupantOf(node)]))

/**
 * The history of a tree nobody has changed yet: every id present in it arrived
 * at its revision. Usually revision 0, but a caller auditing from a later known
 * state gets an honest starting point rather than a fictional one.
 */
export const seedIdHistory = (seed: LoomTree): IdHistory =>
  new Map(
    Array.from(occupantsOf(seed), ([nodeId, occupant]) => [
      nodeId,
      [{ enteredAt: seed.revision, entered: occupant, leftAt: null, left: null }],
    ])
  )

const closeTenancy = (
  tenancies: readonly IdTenancy[],
  leftAt: number,
  left: Occupant
): readonly IdTenancy[] =>
  tenancies.map((tenancy, index) =>
    index === tenancies.length - 1 && tenancy.leftAt === null
      ? { ...tenancy, leftAt, left }
      : tenancy
  )

/**
 * Extends a history by one revision, from the two states either side of it.
 *
 * Deliberately takes trees rather than the delta that produced them. Presence is
 * the only thing identity turns on, and presence is a property of the states: a
 * `move` cannot change it, a `configure` cannot change it, and reading it off
 * the operations would mean re-deriving what "the tree afterwards" means in a
 * second place. `applyDelta` is the one thing allowed to answer that.
 *
 * A whole subtree that leaves records a departure for every id in it, not only
 * the one the `remove` named — every one of them is an address that could later
 * be reused, and reporting only the root would miss it.
 */
export const trackIds = (history: IdHistory, before: LoomTree, after: LoomTree): IdHistory => {
  const wasThere = occupantsOf(before)
  const isThere = occupantsOf(after)
  const tracked = new Map(history)

  for (const [nodeId, occupant] of wasThere) {
    if (isThere.has(nodeId)) continue

    const tenancies = tracked.get(nodeId)
    if (tenancies) tracked.set(nodeId, closeTenancy(tenancies, after.revision, occupant))
  }

  for (const [nodeId, occupant] of isThere) {
    if (wasThere.has(nodeId)) continue

    const arrival: IdTenancy = {
      enteredAt: after.revision,
      entered: occupant,
      leftAt: null,
      left: null,
    }

    tracked.set(nodeId, [...(tracked.get(nodeId) ?? []), arrival])
  }

  return tracked
}

/**
 * An id that left the tree and came back.
 *
 * Two outcomes rather than one, because they mean opposite things to a reader.
 * `restored` is a removal that was taken back and is the expected shape of an
 * undo — reported because it is a real event in the tree's history, not because
 * anything is wrong. `recycled` is one address naming two different nodes, which
 * makes every id-joined reading of this tree's log ambiguous from `returnedAt`
 * onwards.
 */
export type IdReturn =
  | {
      readonly code: "restored"
      readonly nodeId: NodeId
      readonly label: string
      readonly leftAt: number
      readonly returnedAt: number
    }
  | {
      readonly code: "recycled"
      readonly nodeId: NodeId
      readonly leftAs: string
      readonly returnedAs: string
      readonly leftAt: number
      readonly returnedAt: number
    }

const returnBetween = (
  nodeId: NodeId,
  previous: IdTenancy,
  next: IdTenancy
): IdReturn | undefined => {
  if (previous.leftAt === null || previous.left === null) return undefined

  return previous.left.fingerprint === next.entered.fingerprint
    ? {
        code: "restored",
        nodeId,
        label: next.entered.label,
        leftAt: previous.leftAt,
        returnedAt: next.enteredAt,
      }
    : {
        code: "recycled",
        nodeId,
        leftAs: previous.left.label,
        returnedAs: next.entered.label,
        leftAt: previous.leftAt,
        returnedAt: next.enteredAt,
      }
}

/**
 * Every return in a history, in the order they happened.
 *
 * Chronological rather than grouped by id, because a reader is asking what
 * became of this tree and not what became of one address. Ties within a revision
 * are broken by id so the reading is stable across runs.
 */
export const idReturnsIn = (history: IdHistory): readonly IdReturn[] =>
  Array.from(history)
    .flatMap(([nodeId, tenancies]) =>
      tenancies.flatMap((tenancy, index) => {
        const previous = tenancies[index - 1]

        if (previous === undefined) return []

        const found = returnBetween(nodeId, previous, tenancy)

        return found === undefined ? [] : [found]
      })
    )
    .sort(
      (left, right) =>
        left.returnedAt - right.returnedAt || left.nodeId.localeCompare(right.nodeId)
    )

/** The returns that make an id ambiguous, which is the subset worth acting on. */
export const recycledIds = (returns: readonly IdReturn[]): readonly IdReturn[] =>
  returns.filter((found) => found.code === "recycled")
