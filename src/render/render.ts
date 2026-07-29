import { createElement, Fragment, type ReactNode } from "react"

import { assertNever } from "../result.js"
import type { ElementNode, LoomNode, SlotNode } from "../tree/node.js"
import type { LoomTree } from "../tree/tree.js"

import type { RenderDiagnostic } from "./diagnostics.js"
import { editableAttributes } from "./editable.js"
import type { LoomPrimitive, LoomRenderContext, PrimitiveResolver } from "./primitive.js"

/**
 * The tree, projected into React.
 *
 * The projection is a pure function of the tree, the resolver, and the render
 * options: no hooks, no state, no IO, no module-level cache. That is what lets
 * it run per request on an edge runtime or inside a Server Component, and it is
 * why two requests for the same revision cannot disagree about what the page
 * is.
 *
 * Node ids do double duty as React keys. They are stable across move and
 * configure by construction (see `ids.ts`), so React reconciles a moved subtree
 * as a move rather than as a delete and an insert — the property §1 minted ids
 * for, collected here.
 */

/**
 * Content the host projects into named slots. A slot the host does not name
 * falls back to the node's own children; to project nothing into one, name it
 * with `null`.
 */
export type SlotContent = Readonly<Record<string, ReactNode>>

export type RenderOptions = {
  readonly resolver: PrimitiveResolver
  /** Off by default: decoration is opt-in per request, never ambient. */
  readonly editMode?: boolean
  readonly slots?: SlotContent
}

export type RenderOutput = {
  readonly element: ReactNode
  readonly diagnostics: readonly RenderDiagnostic[]
}

type RenderContext = {
  readonly resolver: PrimitiveResolver
  readonly editMode: boolean
  readonly slots: SlotContent
  readonly tree: LoomTree
  readonly collect: (diagnostic: RenderDiagnostic) => void
}

const renderChildren = (children: readonly LoomNode[], context: RenderContext): ReactNode =>
  children.length === 0 ? null : children.map((child) => renderNode(child, context))

const renderContextFor = (node: ElementNode, context: RenderContext): LoomRenderContext => {
  if (!context.editMode) return { nodeId: node.id, type: node.type }

  const isRoot = node.id === context.tree.root.id

  return {
    nodeId: node.id,
    type: node.type,
    editable: editableAttributes(node, isRoot ? context.tree : undefined),
  }
}

const renderElement = (node: ElementNode, context: RenderContext): ReactNode => {
  const primitive: LoomPrimitive | undefined = context.resolver.resolve(node.type)

  /**
   * An unknown primitive omits its whole subtree rather than promoting the
   * children into the missing container's place: a card's contents spilling
   * into the page body is a worse failure than a gap, and a gap is what the
   * diagnostic describes.
   */
  if (!primitive) {
    context.collect({ code: "unknown-primitive", nodeId: node.id, type: node.type })
    return null
  }

  return createElement(primitive, {
    key: node.id,
    loom: renderContextFor(node, context),
    props: node.props,
    children: renderChildren(node.children, context),
  })
}

/**
 * A slot is a projection point, not a box. It renders its projected content, or
 * its own children as the fallback when the host projected nothing, and adds no
 * element of its own in either case.
 */
const renderSlot = (node: SlotNode, context: RenderContext): ReactNode => {
  /** Own-property only, for the reason given in `staticPrimitiveResolver`. */
  const projected = Object.hasOwn(context.slots, node.name)
    ? context.slots[node.name]
    : renderChildren(node.children, context)

  return createElement(Fragment, { key: node.id }, projected)
}

const renderNode = (node: LoomNode, context: RenderContext): ReactNode => {
  switch (node.kind) {
    case "element":
      return renderElement(node, context)
    case "text":
      return node.value
    case "slot":
      return renderSlot(node, context)
    default:
      return assertNever(node, "renderNode")
  }
}

export const renderLoomTree = (tree: LoomTree, options: RenderOptions): RenderOutput => {
  const diagnostics: RenderDiagnostic[] = []

  const element = renderNode(tree.root, {
    resolver: options.resolver,
    editMode: options.editMode ?? false,
    slots: options.slots ?? {},
    tree,
    collect: (diagnostic) => {
      diagnostics.push(diagnostic)
    },
  })

  return { element, diagnostics }
}
