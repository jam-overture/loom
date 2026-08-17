import { createElement, Fragment, type CSSProperties, type ReactNode } from "react"

import { NO_DATA, type DataResolution, type NodeData } from "../data/resolution.js"
import type { JsonObject } from "../json.js"
import { DATA_PROP_KEY } from "../reserved-props.js"
import { assertNever } from "../result.js"
import type { ThemeRegistry } from "../theme/registry.js"
import type { ResolvedTheme } from "../theme/theme.js"
import type { ElementNode, LoomNode, SlotNode } from "../tree/node.js"
import type { LoomTree } from "../tree/tree.js"

import type { RenderDiagnostic } from "./diagnostics.js"
import { editableAttributes } from "./editable.js"
import {
  NO_SLOTS,
  type LoomPrimitive,
  type LoomRenderContext,
  type PrimitiveResolver,
  type SlotChildren,
} from "./primitive.js"
import type { PropsValidator } from "./props.js"
import { NO_TEXT, type PrimitiveText, type TextResolver } from "./text.js"
import { partitionReservedProps, resolveTheme, themeStyle, THEME_PROP_KEY } from "./theme.js"

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
  /**
   * Absent means props are not checked against declared schemas. A registry
   * built by §4's SDK satisfies both this and `resolver`, so wiring the same
   * object into both is the ordinary case.
   */
  readonly validator?: PropsValidator
  /**
   * Absent means the tree's theme is not resolved and nothing is mounted, and
   * a tree that names one says so in a diagnostic. Supplying a registry is what
   * bounds the palettes, font packs and style presets a proposal may name (0049).
   */
  readonly themes?: ThemeRegistry
  /**
   * Absent means the tree's bindings are not answered, and a tree that declares
   * one says so in a diagnostic. Resolution is async and rendering is not, so it
   * happens before the walk — `renderRequest` does it, and a caller driving
   * `renderLoomTree` itself resolves with `resolveTreeData` first (0058).
   */
  readonly data?: DataResolution
  /**
   * Absent means every primitive is handed an empty string map — including the
   * strings it declared itself. A registry built by §4's SDK is a `TextResolver`
   * over its own declarations, so wiring the same object into `resolver` and
   * here is the ordinary case and is what an untranslated deployment wants;
   * `textResolverFor` wraps it with a dictionary to translate.
   */
  readonly text?: TextResolver
  /** Off by default: decoration is opt-in per request, never ambient. */
  readonly editMode?: boolean
  readonly slots?: SlotContent
}

export type RenderOutput = {
  readonly element: ReactNode
  readonly diagnostics: readonly RenderDiagnostic[]
  /**
   * What the root is wearing, absent when the tree named no theme or the render
   * could not resolve it. The variables are already mounted; this is here so a
   * caller can *say* which palette it served without resolving the ids again.
   */
  readonly theme?: ResolvedTheme
}

type RenderContext = {
  readonly resolver: PrimitiveResolver
  readonly validator: PropsValidator | undefined
  readonly editMode: boolean
  readonly slots: SlotContent
  readonly tree: LoomTree
  /** Mounted on the root element, and nowhere else. */
  readonly theme: CSSProperties | undefined
  readonly data: DataResolution | undefined
  readonly text: TextResolver | undefined
  readonly collect: (diagnostic: RenderDiagnostic) => void
}

const renderChildren = (children: readonly LoomNode[], context: RenderContext): ReactNode =>
  children.length === 0 ? null : children.map((child) => renderNode(child, context))

const isRootNode = (node: ElementNode, context: RenderContext): boolean =>
  node.id === context.tree.root.id

/**
 * An element's children, split the way its primitive receives them: `slot`
 * children become named regions, and everything else stays in `children`.
 *
 * Only *direct* slot children are routed. A slot nested inside another slot's
 * fallback renders where it sits, because hoisting it to the nearest element
 * ancestor would move content out of the region a person put it in — and the
 * whole point of a region is that the primitive decides where it goes.
 *
 * Two slot children sharing a name are both placed there, in tree order. The
 * alternative — one wins — makes the render a function of child order in a way
 * nothing else here is.
 */
type ElementBody = {
  readonly children: ReactNode
  readonly slots: SlotChildren
}

const renderElementBody = (node: ElementNode, context: RenderContext): ElementBody => {
  if (!node.children.some((child) => child.kind === "slot")) {
    return { children: renderChildren(node.children, context), slots: NO_SLOTS }
  }

  const slots: Record<string, ReactNode> = Object.create(null) as Record<string, ReactNode>
  const rest: ReactNode[] = []

  for (const child of node.children) {
    if (child.kind !== "slot") {
      rest.push(renderNode(child, context))
      continue
    }

    const placed = renderNode(child, context)
    const existing = slots[child.name]

    slots[child.name] =
      existing === undefined ? placed : [...(Array.isArray(existing) ? existing : [existing]), placed]
  }

  return { children: rest.length === 0 ? null : rest, slots: Object.freeze(slots) }
}

const renderContextFor = (
  node: ElementNode,
  slots: SlotChildren,
  data: NodeData,
  text: PrimitiveText<string>,
  context: RenderContext
): LoomRenderContext => {
  const isRoot = isRootNode(node, context)
  const theme = isRoot ? context.theme : undefined

  return {
    nodeId: node.id,
    type: node.type,
    slots,
    data,
    text,
    ...(context.editMode
      ? { editable: editableAttributes(node, isRoot ? context.tree : undefined) }
      : {}),
    ...(theme ? { theme } : {}),
  }
}

/**
 * The answers for a node that declared bindings, and a diagnostic for each one
 * that has none. The plan was read from this same tree before the walk began, so
 * the lookup is a map read: nothing here parses, asks or waits.
 */
const nodeDataFor = (node: ElementNode, context: RenderContext): NodeData => {
  if (!context.data) {
    context.collect({ code: "data-unresolved", nodeId: node.id })

    return NO_DATA
  }

  for (const problem of context.data.problemsFor(node.id)) {
    context.collect(
      problem.kind === "misdeclared"
        ? { code: "data-misdeclared", nodeId: node.id, error: problem.error }
        : {
            code: "data-unavailable",
            nodeId: node.id,
            name: problem.name,
            source: problem.source,
            unavailable: problem.unavailable,
          }
    )
  }

  return context.data.lookup(node.id)
}

/**
 * Reserved keys are removed from every node's props, whether or not anything
 * reads them here; a key that reaches a primitive is a key that primitive has
 * to know about. What each one means, though, depends on where it sits, so
 * anything unread is reported rather than dropped in silence.
 */
const reportUnreadReservedProps = (
  node: ElementNode,
  reserved: JsonObject,
  isRoot: boolean,
  context: RenderContext
): void => {
  for (const key of Object.keys(reserved)) {
    if (key === THEME_PROP_KEY) {
      if (!isRoot) context.collect({ code: "theme-misplaced", nodeId: node.id })
      continue
    }

    /** Read before the walk, by the data seam, and reported by `nodeDataFor`. */
    if (key === DATA_PROP_KEY) continue

    context.collect({ code: "reserved-prop-unrecognised", nodeId: node.id, key })
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

  const { props, reserved } = partitionReservedProps(node.props)
  reportUnreadReservedProps(node, reserved, isRootNode(node, context), context)

  /**
   * Props that do not satisfy the primitive's declared schema omit the node the
   * same way an unknown primitive does. Rendering it anyway would hand a
   * primitive a bag its own types say cannot occur, which pushes an unchecked
   * cast into every primitive author's lap; refusing one node and reporting why
   * keeps the failure where the mismatch is.
   */
  const verdict = context.validator?.validateProps(node.type, props)

  if (verdict?.outcome === "invalid") {
    context.collect({
      code: "invalid-props",
      nodeId: node.id,
      type: node.type,
      issues: verdict.issues,
    })

    return null
  }

  if (verdict?.outcome === "undeclared") {
    context.collect({ code: "props-undeclared", nodeId: node.id, type: node.type })
  }

  const data = reserved[DATA_PROP_KEY] === undefined ? NO_DATA : nodeDataFor(node, context)

  /**
   * A map read, and the same map for every node of one type — the merge with
   * whatever dictionary this deployment supplied happened once, when the
   * resolver was built.
   */
  const text = context.text?.textFor(node.type) ?? NO_TEXT
  const body = renderElementBody(node, context)

  return createElement(primitive, {
    key: node.id,
    loom: renderContextFor(node, body.slots, data, text, context),
    props,
    children: body.children,
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

/**
 * The theme is resolved once, from the root, before the walk begins — a tree
 * wears one theme and the variables cascade to everything under it, so
 * resolving per node would be the same answer computed for every node in the
 * page.
 */
const mountedTheme = (
  tree: LoomTree,
  registry: ThemeRegistry | undefined,
  collect: (diagnostic: RenderDiagnostic) => void
): ResolvedTheme | undefined => {
  const { reserved } = partitionReservedProps(tree.root.props)
  const resolution = resolveTheme(reserved, registry)

  switch (resolution.outcome) {
    case "themed":
      return resolution.theme
    case "unthemed":
      return undefined
    case "unregistered":
      collect({ code: "theme-unregistered", nodeId: tree.root.id })
      return undefined
    case "unresolved":
      collect({ code: "theme-unresolved", nodeId: tree.root.id, error: resolution.error })
      return undefined
    default:
      return assertNever(resolution, "mountedTheme")
  }
}

export const renderLoomTree = (tree: LoomTree, options: RenderOptions): RenderOutput => {
  const diagnostics: RenderDiagnostic[] = []
  const collect = (diagnostic: RenderDiagnostic): void => {
    diagnostics.push(diagnostic)
  }

  const theme = mountedTheme(tree, options.themes, collect)

  const element = renderNode(tree.root, {
    resolver: options.resolver,
    validator: options.validator,
    editMode: options.editMode ?? false,
    slots: options.slots ?? {},
    tree,
    theme: theme ? themeStyle(theme) : undefined,
    data: options.data,
    text: options.text,
    collect,
  })

  return { element, diagnostics, ...(theme ? { theme } : {}) }
}
