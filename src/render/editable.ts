import type { ElementNode } from "../tree/node.js"
import type { LoomTree } from "../tree/tree.js"

/**
 * Edit mode decorates; it never restructures.
 *
 * A node's identity reaches the browser as data attributes the primitive
 * spreads onto its own root element. The renderer does not wrap anything in a
 * wrapper element to carry them, because a wrapper changes what `>`,
 * `:first-child`, and `:nth-child` select, and a UI that only lays out
 * correctly when edit mode is off is not the UI anyone reviewed.
 *
 * When edit mode is off these are never built, so the cost of the whole
 * decorator is one boolean test per element.
 */

export const LOOM_NODE_ATTRIBUTE = "data-loom-node"
export const LOOM_TYPE_ATTRIBUTE = "data-loom-type"
export const LOOM_TREE_ATTRIBUTE = "data-loom-tree"
export const LOOM_REVISION_ATTRIBUTE = "data-loom-revision"

export type EditableAttributes = {
  readonly [LOOM_NODE_ATTRIBUTE]: string
  readonly [LOOM_TYPE_ATTRIBUTE]: string
  /** Root element only — see `editableAttributes`. */
  readonly [LOOM_TREE_ATTRIBUTE]?: string
  readonly [LOOM_REVISION_ATTRIBUTE]?: string
}

/**
 * The root element additionally carries the tree it belongs to and the revision
 * it was rendered from, which is exactly the pair an `EditIntent` needs as its
 * base. A portal can author an intent from the DOM alone, and an intent
 * authored against a stale render names the stale revision rather than
 * silently claiming the current one.
 */
export const editableAttributes = (node: ElementNode, tree?: LoomTree): EditableAttributes =>
  tree
    ? {
        [LOOM_NODE_ATTRIBUTE]: node.id,
        [LOOM_TYPE_ATTRIBUTE]: node.type,
        [LOOM_TREE_ATTRIBUTE]: tree.treeId,
        [LOOM_REVISION_ATTRIBUTE]: String(tree.revision),
      }
    : {
        [LOOM_NODE_ATTRIBUTE]: node.id,
        [LOOM_TYPE_ATTRIBUTE]: node.type,
      }
