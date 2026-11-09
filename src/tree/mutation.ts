import type { NodeId } from "../ids.js"
import { err, flatMapResult, mapResult, ok, type Result } from "../result.js"

import type { TreeError } from "./errors.js"
import { findNode, findParent, nodePath } from "./navigation.js"
import {
  isContainerNode,
  withChildren,
  type ElementNode,
  type LoomNode,
  type SlotNode,
} from "./node.js"

/**
 * Structural edits on an immutable tree. Each returns a new root; nodes off the
 * edited path keep their identity, so a renderer can rely on reference equality
 * to skip untouched subtrees.
 *
 * **Nothing here recurses into the tree, and nothing rebuilds a list of
 * children one child at a time**, for the same reason the reads in
 * `navigation.ts` do not (0372, 0373): a page's shape is data, and an edit that
 * spends a call frame per level or copies the accumulated siblings per sibling
 * stops answering at a shape a page is allowed to have.
 */

export type NodeTransform = (node: LoomNode) => Result<LoomNode, TreeError>

const requireContainer = (node: LoomNode): Result<ElementNode | SlotNode, TreeError> =>
  isContainerNode(node)
    ? ok(node)
    : err({ code: "not-a-container", nodeId: node.id, nodeKind: node.kind })

/** One child swapped for its rebuilt self, by reference, in one pass. */
const withChildSwapped = (
  parent: LoomNode,
  previous: LoomNode,
  next: LoomNode
): Result<LoomNode, TreeError> =>
  mapResult(requireContainer(parent), (container) =>
    withChildren(
      container,
      container.children.map((child) => (child === previous ? next : child))
    )
  )

/**
 * The addressed node, transformed, and every ancestor rebuilt around it.
 *
 * It descends by the **path** rather than by a search. `nodePath` names the
 * chain from the root to the node in one walk, so the rebuild touches one node
 * per level and asks nothing: no `containsNode` per level, no frame per level.
 *
 * Where a tree holds the same id twice — which `duplicateNodeIds` exists to
 * find and no valid tree has — the node this edits is the first in tree order,
 * because that is the one `nodePath` addresses. The search this replaced edited
 * every copy.
 */
export const replaceNode = (
  root: LoomNode,
  nodeId: NodeId,
  transform: NodeTransform
): Result<LoomNode, TreeError> => {
  const path = nodePath(root, nodeId)
  const [target, ...ancestorsNearestFirst] = path ? [...path].reverse() : []
  if (!target) return err({ code: "node-not-found", nodeId })

  const rebuilt = ancestorsNearestFirst.reduce<
    Result<{ readonly was: LoomNode; readonly now: LoomNode }, TreeError>
  >(
    (carried, ancestor) =>
      flatMapResult(carried, (below) =>
        mapResult(withChildSwapped(ancestor, below.was, below.now), (next) => ({
          was: ancestor,
          now: next,
        }))
      ),
    mapResult(transform(target), (now) => ({ was: target, now }))
  )

  return mapResult(rebuilt, (top) => top.now)
}

export const insertChild = (
  root: LoomNode,
  parentId: NodeId,
  index: number,
  node: LoomNode
): Result<LoomNode, TreeError> => {
  const parent = findNode(root, parentId)
  if (!parent) return err({ code: "node-not-found", nodeId: parentId })

  const container = requireContainer(parent)
  if (!container.ok) return container

  const childCount = container.value.children.length
  if (!Number.isInteger(index) || index < 0 || index > childCount) {
    return err({ code: "index-out-of-range", parentId, index, childCount })
  }

  return replaceNode(root, parentId, (current) =>
    mapResult(requireContainer(current), (target) =>
      withChildren(target, [
        ...target.children.slice(0, index),
        node,
        ...target.children.slice(index),
      ])
    )
  )
}

export type DetachedTree = {
  readonly root: LoomNode
  readonly detached: LoomNode
}

export const detachNode = (root: LoomNode, nodeId: NodeId): Result<DetachedTree, TreeError> => {
  if (root.id === nodeId) return err({ code: "root-not-detachable", nodeId })

  const detached = findNode(root, nodeId)
  if (!detached) return err({ code: "node-not-found", nodeId })

  const parent = findParent(root, nodeId)
  if (!parent) return err({ code: "node-not-found", nodeId })

  const pruned = replaceNode(root, parent.id, (current) =>
    mapResult(requireContainer(current), (target) =>
      withChildren(
        target,
        target.children.filter((child) => child.id !== nodeId)
      )
    )
  )

  return mapResult(pruned, (nextRoot) => ({ root: nextRoot, detached }))
}
