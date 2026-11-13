import type { AudienceId } from "../audience/audience.js"
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
export const LOOM_AUDIENCE_ATTRIBUTE = "data-loom-audience"

export type EditableAttributes = {
  readonly [LOOM_NODE_ATTRIBUTE]: string
  readonly [LOOM_TYPE_ATTRIBUTE]: string
  /** Root element only — see `editableAttributes`. */
  readonly [LOOM_TREE_ATTRIBUTE]?: string
  readonly [LOOM_REVISION_ATTRIBUTE]?: string
  /** Root element only, and only when the page was served to a segment. */
  readonly [LOOM_AUDIENCE_ATTRIBUTE]?: string
}

/**
 * The root element additionally carries the tree it belongs to and the revision
 * it was rendered from, which is exactly the pair an `EditIntent` needs as its
 * base. A portal can author an intent from the DOM alone, and an intent
 * authored against a stale render names the stale revision rather than
 * silently claiming the current one.
 *
 * It carries the segment the page was served to as well, when it was served to
 * one (0284, 0371), because the browser cannot work that out for itself: the
 * site's server sorted the reader, and this is how the page's signals learn
 * which segment to be filed under. The renderer never hands it `aud_everyone`
 * (see `RenderOptions.audience`), because a page that names no audience already
 * means it.
 *
 * Only a type is imported for it: this file is what `addressed.ts` hands a
 * reader's browser, and the id's schema would bring the schema library with it.
 */
export const editableAttributes = (
  node: ElementNode,
  tree?: LoomTree,
  audience?: AudienceId
): EditableAttributes =>
  tree
    ? {
        [LOOM_NODE_ATTRIBUTE]: node.id,
        [LOOM_TYPE_ATTRIBUTE]: node.type,
        [LOOM_TREE_ATTRIBUTE]: tree.treeId,
        [LOOM_REVISION_ATTRIBUTE]: String(tree.revision),
        ...(audience === undefined ? {} : { [LOOM_AUDIENCE_ATTRIBUTE]: audience }),
      }
    : {
        [LOOM_NODE_ATTRIBUTE]: node.id,
        [LOOM_TYPE_ATTRIBUTE]: node.type,
      }
