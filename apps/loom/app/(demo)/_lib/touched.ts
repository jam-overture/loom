import type { LoomNode, NodeId, TreeDelta, TreeOperation } from "@loom/runtime"

import { wordsOfNode, type PlainChange } from "./plain-change"

/**
 * Which nodes a change is about, so a surface can point at them.
 *
 * The record already says what a change did, in the runtime's own words —
 * `remove demo-n17`, `configure demo-n3: backdrop`. That is exact and it is
 * unreadable, and worse, it is on the *rail* while the thing it describes is on
 * the *stage*. A visitor pressed a button, four hundred pixels of page they
 * could not see moved, and the only account of it was a node id.
 *
 * So this is the same delta read for a different question: not *what happened*
 * but *where*. It is a projection of operations that already exist — nothing is
 * computed for display and nothing is guessed — and it is deliberately not the
 * `describeOperation` strings parsed back out, because a sentence is written for
 * a reader and a node id is written for a machine, and only one of them survives
 * a copy-edit.
 */

export type TouchKind = "added" | "removed" | "moved" | "changed"

export type TouchedNode = {
  readonly kind: TouchKind
  /**
   * The node the operation named.
   *
   * It is in the resulting tree for every kind but `removed` — and it is *not*
   * in the tree the visitor is looking at when the change is still waiting on
   * them, because an `added` node does not exist until the change applies. Both
   * of those are why `parentId` and `index` are here.
   */
  readonly nodeId: NodeId
  /** Where the node belongs, when there is no node in the tree to point at. */
  readonly parentId?: NodeId
  readonly index?: number
  /**
   * The words this node puts on the page, for the case where the page cannot
   * show them: it has gone, or it has not arrived.
   *
   * **This is the half `parentId` and `index` were always missing.** Those two
   * give a mark somewhere to be drawn — the gap the node left, or the gap it
   * would fill — and a gap is empty by definition, so the mark drawn in it had
   * nothing to name and said *"Something was removed here"*. A visitor who had
   * not memorised the band was being pointed at a blank strip and told that
   * something used to be in it.
   *
   * The words are already in hand at the only moment this is computed. A
   * removal's inverse carries the whole removed subtree (`whereItWas` is
   * already reading it for the position), and an insert carries the subtree it
   * is about to add. Neither is fetched, re-resolved or guessed: the same
   * operation that gives the mark its position gives it its words.
   *
   * Absent when the caller passed no `settings`, which is the honest reading —
   * which of a primitive's strings are words on the page and which are settings
   * is the registry's to say (`plain-change.ts`), and a caller without it is
   * describing a delta nobody has rendered.
   */
  readonly words?: Pick<PlainChange, "words" | "more">
}

/**
 * The inverse of a `remove` is an `insert` of the same node, which is the only
 * place the parent and position of a removed node survive. `assessReversibility`
 * computes it whether or not anybody undoes anything, so this costs nothing.
 */
const whereItWas = (
  nodeId: NodeId,
  inverse: readonly TreeOperation[],
  settings: ReadonlySet<string> | undefined
): Pick<TouchedNode, "parentId" | "index" | "words"> => {
  const restoring = inverse.find(
    (operation) => operation.op === "insert" && operation.node.id === nodeId
  )

  if (restoring?.op !== "insert") return {}

  return {
    parentId: restoring.parentId,
    index: restoring.index,
    ...spoken(restoring.node, settings),
  }
}

/**
 * What a subtree says, when there is somebody to say which of its strings are
 * words. Spread rather than returned, so a caller with no registry produces
 * exactly the object it produced before this field existed.
 */
const spoken = (
  node: LoomNode,
  settings: ReadonlySet<string> | undefined
): Pick<TouchedNode, "words"> =>
  settings === undefined ? {} : { words: wordsOfNode(node, settings) }

const touchOf = (
  operation: TreeOperation,
  inverse: readonly TreeOperation[],
  settings: ReadonlySet<string> | undefined
): TouchedNode => {
  switch (operation.op) {
    case "insert":
      return {
        kind: "added",
        nodeId: operation.node.id,
        parentId: operation.parentId,
        index: operation.index,
        ...spoken(operation.node, settings),
      }
    case "remove":
      return {
        kind: "removed",
        nodeId: operation.nodeId,
        ...whereItWas(operation.nodeId, inverse, settings),
      }
    case "move":
      return {
        kind: "moved",
        nodeId: operation.nodeId,
        parentId: operation.parentId,
        index: operation.index,
      }
    case "configure":
      return { kind: "changed", nodeId: operation.nodeId }
  }
}

/**
 * What this delta is about, in the order the operations were proposed.
 *
 * `inverse` is optional because a surface may want this for a delta nobody has
 * assessed. Without it a removed node has no position, which costs a caller the
 * ability to point at the gap and nothing else.
 *
 * `settings` is optional for the same reason and costs the same kind of thing:
 * without it the gap has a position and no words, which is what every caller
 * got before `words` existed.
 *
 * **Only the two kinds with a gap carry words**, and that is the rule rather
 * than an omission. A moved node and a configured one are still on the page, so
 * their mark is drawn on the thing itself with a ring around it and the page is
 * already showing the visitor every word it is about. Quoting them there would
 * be this surface reading a band back to somebody who is looking at it.
 */
export const touchedBy = (
  delta: TreeDelta,
  inverse?: TreeDelta,
  settings?: ReadonlySet<string>
): readonly TouchedNode[] =>
  delta.operations.map((operation) => touchOf(operation, inverse?.operations ?? [], settings))

/**
 * The words an earlier reading of the same change already had.
 *
 * **The Gate looks twice and only the first look has a tree.** An ask is
 * assessed when it is made, against the tree the server action read before
 * writing; confirming a hold narrates a *second* assessment of the same
 * proposal, and that one is folded onto the record with no tree in hand
 * (`actions.ts`), because the surface answering a question is not the surface
 * that asked it.
 *
 * Everything else on a record survives that by being absent from the second
 * fold — `did` is written only when there is a tree, so the held card's
 * sentence is still on the applied one. `touched` is not absent: the second
 * assessment recomputes it, correctly, for the kind and the position — and
 * wordlessly. So the payoff of this whole surface, the mark in the gap at the
 * moment the change lands, was the one place the words could not reach: every
 * fold that had them was a fold nobody was looking at.
 *
 * Matched on the node and the kind together, and only ever *filled in*. The two
 * assessments are of one proposal so the operations are the same operations;
 * a fresh reading that has words of its own keeps them, and one whose node the
 * earlier reading does not name gets nothing. The words are never invented and
 * never overwritten.
 */
export const keepingWords = (
  fresh: readonly TouchedNode[],
  earlier: readonly TouchedNode[] | undefined
): readonly TouchedNode[] => {
  if (earlier === undefined) return fresh

  return fresh.map((one) => {
    if (one.words !== undefined) return one

    const before = earlier.find(
      (each) => each.nodeId === one.nodeId && each.kind === one.kind && each.words !== undefined
    )

    return before?.words === undefined ? one : { ...one, words: before.words }
  })
}
