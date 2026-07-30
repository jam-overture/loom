import type { NodeId } from "../ids.js"
import type { PrimitiveType } from "../primitive-type.js"
import { nodePath } from "../tree/navigation.js"
import type { LoomNode } from "../tree/node.js"

/**
 * Which node in the tree a click in the browser can actually land on.
 *
 * Edit mode decorates elements and nothing else (0010): a text node renders as a
 * bare string and a slot renders as a Fragment, so neither leaves anything in the
 * DOM to carry `data-loom-node`. On top of that, 0012 made conformance reported
 * rather than enforced, so a registered primitive is allowed to ignore
 * `loom.editable` — it renders correctly and is invisible to a portal.
 *
 * The consequence is that *the tree a user sees in an outline is not the same set
 * of nodes the DOM can address*, and something has to reconcile the two. 0019
 * fixed what that something must do: fall back to the nearest decorated ancestor,
 * and say so. Wrapping an undecorated primitive to force a handle would restructure
 * the DOM, which 0010 forbids for good reason.
 *
 * This module is the reconciliation, as a pure function. It takes a predicate
 * rather than a registry so it depends on nothing: what makes a type decorated is
 * the host's business (`decorationFromAudit` in the SDK answers it from a
 * conformance audit), and a caller with better knowledge — a recorded probe, an
 * allowlist — can answer it differently without this module changing.
 */

/** Whether elements of this type reach the DOM carrying their decoration. */
export type DecorationLookup = (type: PrimitiveType) => boolean

export type UnaddressableReason =
  /** Text and slot nodes render without an element of their own. */
  | "not-an-element"
  /** A registered primitive that ignores `loom.editable`, or one that is not registered at all. */
  | "undecorated-primitive"
  /** Not in this tree. */
  | "absent"

export type Addressing =
  | { readonly outcome: "addressable"; readonly nodeId: NodeId }
  /** The request is answerable, but by an ancestor rather than by the node asked for. */
  | {
      readonly outcome: "delegated"
      readonly nodeId: NodeId
      readonly requested: NodeId
      readonly reason: UnaddressableReason
    }
  /** Nothing on the path to the root is addressable, so there is nowhere to point. */
  | { readonly outcome: "unaddressable"; readonly requested: NodeId; readonly reason: UnaddressableReason }

const reasonFor = (node: LoomNode, decorates: DecorationLookup): UnaddressableReason | null => {
  if (node.kind !== "element") return "not-an-element"

  return decorates(node.type) ? null : "undecorated-primitive"
}

/**
 * The node a click can land on when the user meant `nodeId`: itself when it is
 * decorated, otherwise its nearest decorated ancestor, otherwise nothing.
 */
export const addressNode = (
  root: LoomNode,
  nodeId: NodeId,
  decorates: DecorationLookup
): Addressing => {
  const path = nodePath(root, nodeId)
  if (!path) return { outcome: "unaddressable", requested: nodeId, reason: "absent" }

  const requested = path.at(-1)

  /** Unreachable: `nodePath` ends at the node it found. */
  if (!requested) return { outcome: "unaddressable", requested: nodeId, reason: "absent" }

  const reason = reasonFor(requested, decorates)
  if (!reason) return { outcome: "addressable", nodeId }

  const ancestors = path.slice(0, -1).reverse()

  for (const ancestor of ancestors) {
    if (!reasonFor(ancestor, decorates)) {
      return { outcome: "delegated", nodeId: ancestor.id, requested: nodeId, reason }
    }
  }

  return { outcome: "unaddressable", requested: nodeId, reason }
}

/** The id a caller should look for in the DOM, or null when there is none. */
export const addressedNodeId = (addressing: Addressing): NodeId | null => {
  switch (addressing.outcome) {
    case "addressable":
    case "delegated":
      return addressing.nodeId
    case "unaddressable":
      return null
  }
}

export const describeAddressing = (addressing: Addressing): string => {
  switch (addressing.outcome) {
    case "addressable":
      return "addressable"
    case "delegated":
      return `${describeReason(addressing.reason)}, so selection falls back to ${addressing.nodeId}`
    case "unaddressable":
      return `${describeReason(addressing.reason)}, and no ancestor is addressable either`
  }
}

const describeReason = (reason: UnaddressableReason): string => {
  switch (reason) {
    case "not-an-element":
      return "this node renders without an element of its own"
    case "undecorated-primitive":
      return "this primitive does not spread loom.editable"
    case "absent":
      return "this node is not in the tree"
  }
}
