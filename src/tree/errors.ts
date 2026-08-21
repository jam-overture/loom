import type { NodeId, TreeId } from "../ids.js"
import { assertNever } from "../result.js"
import type { NodeKind } from "./node.js"

/**
 * What a tree operation says when it refuses.
 *
 * Every failure in this module is a value rather than an exception, and every
 * one of them is a case a caller can handle — a node that is not there, an id
 * used twice, a move into a node that holds nothing.
 */

/**
 * Every way a tree operation can legitimately fail. Data only — rendering a
 * message is a separate concern so hosts can localise or structure it however
 * they like.
 */
export type TreeError =
  | { readonly code: "node-not-found"; readonly nodeId: NodeId }
  | { readonly code: "duplicate-node-id"; readonly nodeId: NodeId }
  /** An id this delta removed, re-inserted as a different node (0038). */
  | { readonly code: "recycled-node-id"; readonly nodeId: NodeId }
  | { readonly code: "not-a-container"; readonly nodeId: NodeId; readonly nodeKind: NodeKind }
  | {
      readonly code: "index-out-of-range"
      readonly parentId: NodeId
      readonly index: number
      readonly childCount: number
    }
  | { readonly code: "move-into-self"; readonly nodeId: NodeId }
  | { readonly code: "move-into-descendant"; readonly nodeId: NodeId; readonly parentId: NodeId }
  | { readonly code: "root-not-detachable"; readonly nodeId: NodeId }
  | {
      readonly code: "unconfigurable-key"
      readonly nodeId: NodeId
      readonly nodeKind: NodeKind
      readonly key: string
    }
  | {
      readonly code: "invalid-configuration"
      readonly nodeId: NodeId
      readonly nodeKind: NodeKind
      readonly detail: string
    }
  | { readonly code: "revision-mismatch"; readonly expected: number; readonly actual: number }
  | { readonly code: "tree-mismatch"; readonly expected: TreeId; readonly actual: TreeId }
  | { readonly code: "schema-violation"; readonly path: string; readonly detail: string }

export const describeTreeError = (error: TreeError): string => {
  switch (error.code) {
    case "node-not-found":
      return `No node ${error.nodeId} in this tree.`
    case "duplicate-node-id":
      return `Node id ${error.nodeId} already exists in this tree.`
    case "recycled-node-id":
      return `Node id ${error.nodeId} was removed earlier in this delta and cannot come back as a different node.`
    case "not-a-container":
      return `Node ${error.nodeId} is a ${error.nodeKind} node and cannot hold children.`
    case "index-out-of-range":
      return `Index ${error.index} is outside 0..${error.childCount} for parent ${error.parentId}.`
    case "move-into-self":
      return `Node ${error.nodeId} cannot be moved into itself.`
    case "move-into-descendant":
      return `Node ${error.nodeId} cannot be moved into its own descendant ${error.parentId}.`
    case "root-not-detachable":
      return `Node ${error.nodeId} is the root and cannot be removed or moved.`
    case "unconfigurable-key":
      return `Key "${error.key}" is not configurable on a ${error.nodeKind} node (${error.nodeId}).`
    case "invalid-configuration":
      return `Invalid configuration for ${error.nodeKind} node ${error.nodeId}: ${error.detail}`
    case "revision-mismatch":
      return `Delta targets revision ${error.expected} but the tree is at revision ${error.actual}.`
    case "tree-mismatch":
      return `Delta targets tree ${error.expected} but was applied to ${error.actual}.`
    case "schema-violation":
      return `Schema violation at ${error.path}: ${error.detail}`
    default:
      return assertNever(error, "describeTreeError")
  }
}
