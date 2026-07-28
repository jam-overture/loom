import type { NodeId } from "../ids.js"
import { err, mapResult, ok, reduceResult, type Result } from "../result.js"

import type { TreeError } from "./errors.js"
import { containsNode, findNode, findParent } from "./navigation.js"
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
 */

export type NodeTransform = (node: LoomNode) => Result<LoomNode, TreeError>

const requireContainer = (node: LoomNode): Result<ElementNode | SlotNode, TreeError> =>
  isContainerNode(node)
    ? ok(node)
    : err({ code: "not-a-container", nodeId: node.id, nodeKind: node.kind })

export const replaceNode = (
  root: LoomNode,
  nodeId: NodeId,
  transform: NodeTransform
): Result<LoomNode, TreeError> => {
  if (!containsNode(root, nodeId)) return err({ code: "node-not-found", nodeId })

  const rebuild = (node: LoomNode): Result<LoomNode, TreeError> => {
    if (node.id === nodeId) return transform(node)
    if (!isContainerNode(node) || !containsNode(node, nodeId)) return ok(node)

    const rebuiltChildren = reduceResult(
      node.children,
      [] as readonly LoomNode[],
      (accumulated, child) => mapResult(rebuild(child), (next) => [...accumulated, next])
    )

    return mapResult(rebuiltChildren, (children) => withChildren(node, children))
  }

  return rebuild(root)
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
