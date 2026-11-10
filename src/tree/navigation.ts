import type { NodeId } from "../ids.js"
import { childrenOf, type LoomNode } from "./node.js"

/**
 * Read-only traversal. Every function here takes a root and derives a view;
 * nothing caches, because a cache would be a second source of truth about a
 * structure that changes on every accepted delta.
 *
 * **Nothing here recurses into the tree**, which is a correctness requirement
 * rather than a preference (0372): a page's depth is data, so a walk that
 * spends a call frame per level stops answering at a depth a tree is allowed to
 * reach. Every walk below carries an explicit stack and is linear in nodes.
 */

export function* walkTree(root: LoomNode): Generator<LoomNode> {
  const pending: LoomNode[] = [root]

  for (let node = pending.pop(); node !== undefined; node = pending.pop()) {
    yield node

    for (const child of [...childrenOf(node)].reverse()) pending.push(child)
  }
}

export const collectNodeIds = (root: LoomNode): readonly NodeId[] =>
  Array.from(walkTree(root), (node) => node.id)

export const findNode = (root: LoomNode, nodeId: NodeId): LoomNode | null => {
  for (const node of walkTree(root)) {
    if (node.id === nodeId) return node
  }

  return null
}

export const containsNode = (root: LoomNode, nodeId: NodeId): boolean =>
  findNode(root, nodeId) !== null

export const findParent = (root: LoomNode, nodeId: NodeId): LoomNode | null => {
  for (const node of walkTree(root)) {
    if (childrenOf(node).some((child) => child.id === nodeId)) return node
  }

  return null
}

/**
 * One step of a descent, and the step it was reached from. A path is read back
 * off these links rather than carried down the walk: a chain of a thousand
 * nodes copied at every level costs the square of the depth in allocation,
 * where a link per node costs one.
 */
type Descent = {
  readonly node: LoomNode
  readonly from: Descent | null
}

const chainTo = (descent: Descent): readonly LoomNode[] => {
  const chain: LoomNode[] = []

  for (let step: Descent | null = descent; step !== null; step = step.from) {
    chain.push(step.node)
  }

  return chain.reverse()
}

/**
 * The chain of nodes from the root down to and including `nodeId`, or null when
 * the node is absent. Paths are derived on demand and never persisted — the id
 * is the stable address, the path is the current position.
 */
export const nodePath = (root: LoomNode, nodeId: NodeId): readonly LoomNode[] | null => {
  const pending: Descent[] = [{ node: root, from: null }]

  for (let descent = pending.pop(); descent !== undefined; descent = pending.pop()) {
    if (descent.node.id === nodeId) return chainTo(descent)

    for (const child of [...childrenOf(descent.node)].reverse()) {
      pending.push({ node: child, from: descent })
    }
  }

  return null
}

/** The same chain as ids, for callers that only need the address. */
export const pathToNode = (root: LoomNode, nodeId: NodeId): readonly NodeId[] | null =>
  nodePath(root, nodeId)?.map((node) => node.id) ?? null

export const isDescendantOf = (root: LoomNode, ancestorId: NodeId, nodeId: NodeId): boolean => {
  const ancestor = findNode(root, ancestorId)
  if (!ancestor) return false

  const beneath = walkTree(ancestor)
  beneath.next()  // a node is not its own descendant, and the walk yields it first

  for (const node of beneath) {
    if (node.id === nodeId) return true
  }

  return false
}

/**
 * What a node says: every text node under it, in tree order, concatenated.
 *
 * Adjacent text nodes join with nothing between them because that is how they
 * render — two text children of one element are one run of text to a reader,
 * and a separator here would put something on a reader's clipboard that is not
 * on their screen.
 *
 * It reads the **tree**, never the rendered markup. A behaviour that acts on a
 * node's text (`render/behaviour.ts`) is then right before the browser has laid
 * anything out, and cannot pick up a label, a caption or a control that a
 * primitive rendered beside the content rather than as it.
 */
export const textOf = (root: LoomNode): string => {
  let text = ""

  for (const node of walkTree(root)) {
    if (node.kind === "text") text += node.value
  }

  return text
}

/** Ids that appear more than once anywhere under `root`. */
export const duplicateNodeIds = (root: LoomNode): readonly NodeId[] => {
  const seen = new Set<NodeId>()
  const duplicates = new Set<NodeId>()

  for (const node of walkTree(root)) {
    if (seen.has(node.id)) duplicates.add(node.id)
    seen.add(node.id)
  }

  return Array.from(duplicates)
}
