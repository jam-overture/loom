import { createElement, Fragment, type CSSProperties, type ReactNode } from "react"

import { NO_DATA, type DataResolution, type NodeData } from "../data/resolution.js"
import type { FrameOriginRegistry } from "../frame/origin.js"
import type { NodeId } from "../ids.js"
import { NO_FRAMES, type NodeFrames } from "../frame/resolution.js"
import type { JsonObject } from "../json.js"
import type { PrimitiveType } from "../primitive-type.js"
import { ANCHOR_PROP_KEY, DATA_PROP_KEY, SUBMIT_PROP_KEY } from "../reserved-props.js"
import { assertNever } from "../result.js"
import { themeVariables, type ThemeVariables } from "../theme/apply.js"
import type { ThemeRegistry } from "../theme/registry.js"
import type { ResolvedTheme } from "../theme/theme.js"
import type { SubmissionOutcome, SubmissionResolution } from "../submit/resolution.js"
import { findNode, textOf } from "../tree/navigation.js"
import type { ElementNode, LoomNode, SlotNode } from "../tree/node.js"
import type { LoomTree } from "../tree/tree.js"

import {
  createAnchorLedger,
  resolveAnchor,
  type AnchorAttributes,
  type AnchorLedger,
} from "./anchor.js"
import {
  isBehaviourResolver,
  NO_RESOLVED_BEHAVIOURS,
  resolveBehaviours,
  type BehaviourName,
  type BehaviourResolver,
  type PrimitiveBehaviours,
} from "./behaviour.js"
import type { DecorativeChildren } from "./decorative.js"
import type { RenderDiagnostic } from "./diagnostics.js"
import { literalThemeElement } from "./inline-variables.js"
import { editableAttributes } from "./editable.js"
import { isFrameResolver, resolveNodeFrames, type FrameResolver } from "./frame.js"
import {
  NO_SLOTS,
  type LoomPrimitive,
  type LoomRenderContext,
  type PrimitiveResolver,
  type SlotChildren,
} from "./primitive.js"
import type { PropsValidator } from "./props.js"
import {
  isTextResolver,
  NO_TEXT,
  overlayText,
  type PrimitiveText,
  type TextResolver,
} from "./text.js"
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
   * Absent means the tree's submissions are not answered, and a tree that names
   * an endpoint says so in a diagnostic. Resolution may do IO — minting a token
   * usually does — so it happens before the walk, the same way data does;
   * `renderRequest` does it, and a caller driving `renderLoomTree` itself
   * resolves with `resolveTreeSubmissions` first (0065).
   */
  readonly submissions?: SubmissionResolution
  /**
   * The origins this deployment is willing to frame (0095). Absent means every
   * framable prop is refused, and each one says so in a diagnostic — the seam
   * fails closed, because the registry *is* the allowlist and a deployment that
   * has not written one has not agreed to run anybody's script inside its
   * pages.
   *
   * Unlike `data` and `submissions` there is nothing to resolve first: an
   * allowlist is static, so the check happens in the walk.
   */
  readonly origins?: FrameOriginRegistry
  /**
   * The host's answer for the strings primitives declared — a dictionary, in the
   * language this deployment serves. Absent means the declared strings render as
   * their authors wrote them, which is what an untranslated deployment wants and
   * needs no wiring: the renderer reads declarations off `resolver` when that
   * resolver is a registry (0063). `textResolverFor` builds one of these from a
   * registry and a dictionary.
   *
   * A key this does not answer keeps its declared string, so a partial
   * dictionary is a partial translation rather than a missing accessible name.
   * There is deliberately no wiring that suppresses a declared string: a control
   * with no accessible name is the failure the seam exists to prevent, and it
   * should not be reachable by leaving something out.
   */
  readonly text?: TextResolver
  /** Off by default: decoration is opt-in per request, never ambient. */
  readonly editMode?: boolean
  /**
   * Stamp each element's identity on the markup without anything else edit mode
   * means, so a published page can say which node a reader saw or clicked.
   *
   * Off by default, and the markup is byte-identical when it is off. It writes
   * exactly the attributes edit mode writes — node id and type on every
   * decorated element, the tree id and revision on the root — because those are
   * the addresses an event about a reader has to carry (0136).
   */
  readonly addressed?: boolean
  readonly slots?: SlotContent
  /**
   * How the mounted theme reaches the elements: as the `var()` references
   * primitives write, or as the values those references stand for.
   *
   * `"variables"` is the default and is what a browser wants — one mount on the
   * root, the cascade underneath it, and a re-theme that touches no node (0049,
   * 0050). `"literals"` is for a medium with no cascade to read them: an image
   * renderer takes inline styles and literal values, and resolves no custom
   * properties, so a share card or an email built out of a real tree needs the
   * substitution done before it leaves here. See `inline-variables.ts` for what
   * this reaches and what it cannot.
   */
  readonly themeValues?: "variables" | "literals"
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
  /** Identity on the markup for a published page. See `RenderOptions.addressed`. */
  readonly addressed: boolean
  readonly slots: SlotContent
  readonly tree: LoomTree
  /** Mounted on the root element, and nowhere else. */
  readonly theme: CSSProperties | undefined
  readonly data: DataResolution | undefined
  readonly submissions: SubmissionResolution | undefined
  readonly origins: FrameOriginRegistry | undefined
  /** Absent for the same reason `behaviours` is: a plain map declares nothing. */
  readonly frames: FrameResolver | undefined
  readonly text: TextResolver | undefined
  /**
   * Absent when the resolver is not a registry, which is also the only way to
   * have registered a primitive that declares a behaviour — so there is nothing
   * for a host to wire here and nothing that can go missing. It is the text
   * seam's base case with no dictionary half to lay over it (0063).
   */
  readonly behaviours: BehaviourResolver | undefined
  /** Who holds each anchor, for the length of this one render. */
  readonly anchors: AnchorLedger
  /**
   * This walk is a decorative copy, so nothing in it carries identity — no
   * editable attributes and no anchor. `editMode` already governs the first;
   * this governs the second, and they are separate because a copy has no
   * identity whether or not anyone is editing.
   */
  readonly decorative: boolean
  /**
   * The mounted theme's variables, when this render was asked for values rather
   * than references. Absent is the ordinary case and the default: a browser
   * resolves them itself, and one mount on the root is what keeps a re-theme
   * from touching a node (0049).
   */
  readonly literals: ThemeVariables | undefined
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

/**
 * A decorative render walks nodes the primary render has already walked, so
 * every diagnostic it could raise is one the caller has been told. Dropping
 * them is what keeps `renderLoomTree`'s output a function of the tree rather
 * than of which primitives happened to ask for a copy.
 */
const discardDiagnostic = (): void => undefined

/**
 * The node's children again, with identity off — see `decorative.ts` for what
 * that buys and what it does not.
 *
 * Rendered on the first call and kept, so a primitive that places the copy in
 * two arrangements gets the same elements both times, and one that never asks
 * pays a closure. The cache lives in this closure rather than at module scope,
 * for the reason `composeText` keeps its map here: two renders of the same tree
 * must not be able to disagree because one of them ran first.
 */
const decorativeChildrenFor = (
  node: ElementNode,
  context: RenderContext
): DecorativeChildren => {
  let copy: ReactNode
  let rendered = false

  return () => {
    if (!rendered) {
      copy = renderChildren(node.children, {
        ...context,
        editMode: false,
        addressed: false,
        decorative: true,
        collect: discardDiagnostic,
      })
      rendered = true
    }

    return copy
  }
}

const renderContextFor = (
  node: ElementNode,
  slots: SlotChildren,
  data: NodeData,
  submit: SubmissionOutcome | undefined,
  frames: NodeFrames,
  anchor: AnchorAttributes | undefined,
  text: PrimitiveText<string>,
  behaviours: PrimitiveBehaviours<BehaviourName>,
  context: RenderContext
): LoomRenderContext => {
  const isRoot = isRootNode(node, context)
  const theme = isRoot ? context.theme : undefined

  return {
    nodeId: node.id,
    type: node.type,
    slots,
    data,
    frames,
    text,
    behaviours,
    decorative: decorativeChildrenFor(node, context),
    ...(submit ? { submit } : {}),
    ...(anchor ? { anchor } : {}),
    ...(context.editMode || context.addressed
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
 * The target for a node that named an endpoint, and a diagnostic when it has
 * none. The plan was read from this same tree before the walk began, so the
 * lookup is a map read: nothing here parses, asks or waits.
 */
const nodeSubmissionFor = (
  node: ElementNode,
  context: RenderContext
): SubmissionOutcome | undefined => {
  if (!context.submissions) {
    context.collect({ code: "submit-unresolved", nodeId: node.id })

    return undefined
  }

  for (const problem of context.submissions.problemsFor(node.id)) {
    context.collect(
      problem.kind === "misdeclared"
        ? { code: "submit-misdeclared", nodeId: node.id, error: problem.error }
        : {
            code: "submit-unavailable",
            nodeId: node.id,
            to: problem.to,
            unavailable: problem.unavailable,
          }
    )
  }

  return context.submissions.lookup(node.id)
}

/**
 * The verdict on every framable prop this node's primitive declared, and a
 * diagnostic for each one that will not be framed.
 *
 * Read from the node's own props rather than from a plan, because there is
 * nothing to plan: the allowlist is already in hand and the check is a URL
 * parse. That is the whole of what makes this seam synchronous where the data
 * and submission seams are not.
 *
 * `frame-same-origin` is reported for a frame that *is* permitted, which no
 * other diagnostic here does. It is not a complaint about the tree — a host
 * registered that origin deliberately — it is the only place in the system that
 * can notice a sandbox is inert, and noticing silently would be the same as not
 * noticing.
 */
const nodeFramesFor = (
  node: ElementNode,
  props: JsonObject,
  context: RenderContext
): NodeFrames => {
  const declared = context.frames?.framePropsFor(node.type) ?? []
  if (declared.length === 0) return NO_FRAMES

  return resolveNodeFrames(props, declared, context.origins, (prop, outcome) => {
    if (outcome.status === "refused") {
      context.collect({ code: "frame-refused", nodeId: node.id, prop, refusal: outcome.refusal })

      return
    }

    if (outcome.sameOrigin) {
      context.collect({
        code: "frame-same-origin",
        nodeId: node.id,
        prop,
        origin: outcome.origin,
      })
    }
  })
}

/**
 * The `id` this node was given, and a diagnostic when the tree named one it
 * could not have.
 *
 * Read from the node's own props with nothing to plan and nothing to wire,
 * exactly as a frame is — an anchor is a string held against a grammar and
 * against the anchors already taken, and neither of those waits on anybody.
 *
 * Nothing is read at all inside a decorative copy. A copy is the same children
 * with identity switched off, and an anchor is identity: emitting one would put
 * the same `id` on two elements, which is the failure the copy exists to avoid
 * in the first place, in the other of its two spellings.
 */
const nodeAnchorFor = (
  node: ElementNode,
  reserved: JsonObject,
  context: RenderContext
): AnchorAttributes | undefined => {
  if (context.decorative) return undefined

  const reading = resolveAnchor(reserved[ANCHOR_PROP_KEY], node.id, context.anchors)

  switch (reading.status) {
    case "anchored":
      return reading.attributes
    case "unusable":
      context.collect({ code: "anchor-unusable", nodeId: node.id, detail: reading.detail })

      return undefined
    case "claimed":
      context.collect({
        code: "anchor-claimed",
        nodeId: node.id,
        anchor: reading.anchor,
        holder: reading.holder,
      })

      return undefined
    default:
      return assertNever(reading, "nodeAnchorFor")
  }
}

/**
 * The controls this node's primitive declared, built from the tree.
 *
 * The content a behaviour acts on is `textOf` the node — read from the tree
 * rather than from the markup around it, so a copy button copies what the page
 * says and not the language label its own primitive rendered beside it.
 *
 * A behaviour whose name could not be resolved is left out and reported, for
 * the reason `resolveBehaviours` gives: a control a screen reader announces as
 * "button" is worse than no control, and this is the only place that can say so.
 */
const nodeBehavioursFor = (
  node: ElementNode,
  text: PrimitiveText<string>,
  context: RenderContext
): PrimitiveBehaviours<BehaviourName> => {
  const declared = context.behaviours?.behavioursFor(node.type) ?? []
  if (declared.length === 0) return NO_RESOLVED_BEHAVIOURS.behaviours

  const resolved = resolveBehaviours(declared, textOf(node), text)

  for (const { behaviour, key } of resolved.unnamed) {
    context.collect({ code: "behaviour-unnamed", nodeId: node.id, behaviour, key })
  }

  return resolved.behaviours
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

    /** The same, by the submission seam and `nodeSubmissionFor`. */
    if (key === SUBMIT_PROP_KEY) continue

    /** Read inside the walk, by `nodeAnchorFor`, which reports its own faults. */
    if (key === ANCHOR_PROP_KEY) continue

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

  const submit =
    reserved[SUBMIT_PROP_KEY] === undefined ? undefined : nodeSubmissionFor(node, context)

  /**
   * A map read, and the same map for every node of one type — the merge with
   * whatever dictionary this deployment supplied happened once, when the
   * resolver was built.
   */
  const frames = nodeFramesFor(node, props, context)

  /**
   * Claimed here rather than while the render context is built, which happens
   * after this node's children have already been walked. First claim in document
   * order has to mean the ancestor, not whichever descendant the walk reached
   * before returning to its parent.
   */
  const anchor =
    reserved[ANCHOR_PROP_KEY] === undefined ? undefined : nodeAnchorFor(node, reserved, context)

  const text = context.text?.textFor(node.type) ?? NO_TEXT
  const behaviours = nodeBehavioursFor(node, text, context)
  const body = renderElementBody(node, context)

  const rendered = {
    loom: renderContextFor(
      node,
      body.slots,
      data,
      submit,
      frames,
      anchor,
      text,
      behaviours,
      context
    ),
    props,
    children: body.children,
  }

  return context.literals
    ? literalThemeElement(primitive, context.literals, node.id, rendered)
    : createElement(primitive, { key: node.id, ...rendered })
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

/**
 * The two halves of the text seam, composed into the one lookup the walk uses.
 *
 * Declarations are read off the resolver, because they belong to the primitive
 * and travel with it; the host's dictionary is laid over them, because the
 * language is the host's. Neither half is required and neither is enough on its
 * own: with no dictionary a page renders the authors' strings, and with a
 * dictionary that answers for only part of the library the rest keeps theirs.
 *
 * The merge is memoised per type for the length of one render — a page with
 * fifty markers merges once, not fifty times — and the cache lives in this
 * closure rather than at module scope, so two renders of the same tree cannot
 * disagree because one of them ran first.
 */
const composeText = (
  resolver: PrimitiveResolver,
  supplied: TextResolver | undefined
): TextResolver | undefined => {
  const declared = isTextResolver(resolver) ? resolver : undefined

  if (!supplied) return declared
  if (!declared) return supplied

  const merged = new Map<PrimitiveType, PrimitiveText<string>>()

  return {
    textFor: (type: PrimitiveType): PrimitiveText<string> => {
      const cached = merged.get(type)
      if (cached) return cached

      const resolved = overlayText(declared.textFor(type), supplied.textFor(type))
      merged.set(type, resolved)

      return resolved
    },
  }
}

/**
 * One walk, from wherever it is told to start.
 *
 * The theme is the *tree's* — resolved from the root's reserved props whichever
 * node this render begins at, because a theme is a fact about the document and
 * not about the node you happened to ask for. What differs between a page and an
 * excerpt is only who mounts it, which is `renderLoomExcerpt`'s business and not
 * this function's.
 */
const renderFrom = (
  tree: LoomTree,
  from: LoomNode,
  options: RenderOptions,
  collect: (diagnostic: RenderDiagnostic) => void
): { readonly element: ReactNode; readonly theme: ResolvedTheme | undefined } => {
  const theme = mountedTheme(tree, options.themes, collect)

  /**
   * There is nothing to substitute against when no theme mounted, so the render
   * proceeds as it always would and says why. The caller asked for values
   * because whatever it is feeding cannot resolve a reference, and in that
   * medium nothing downstream would have noticed they never arrived.
   */
  if (options.themeValues === "literals" && !theme) {
    collect({ code: "theme-values-unmounted", nodeId: tree.root.id })
  }

  const element = renderNode(from, {
    resolver: options.resolver,
    validator: options.validator,
    editMode: options.editMode ?? false,
    addressed: options.addressed ?? false,
    slots: options.slots ?? {},
    tree,
    theme: theme ? themeStyle(theme) : undefined,
    data: options.data,
    submissions: options.submissions,
    origins: options.origins,
    frames: isFrameResolver(options.resolver) ? options.resolver : undefined,
    text: composeText(options.resolver, options.text),
    behaviours: isBehaviourResolver(options.resolver) ? options.resolver : undefined,
    anchors: createAnchorLedger(),
    decorative: false,
    literals:
      options.themeValues === "literals" && theme ? themeVariables(theme) : undefined,
    collect,
  })

  return { element, theme }
}

export const renderLoomTree = (tree: LoomTree, options: RenderOptions): RenderOutput => {
  const diagnostics: RenderDiagnostic[] = []
  const collect = (diagnostic: RenderDiagnostic): void => {
    diagnostics.push(diagnostic)
  }

  const { element, theme } = renderFrom(tree, tree.root, options, collect)

  return { element, diagnostics, ...(theme ? { theme } : {}) }
}

export type ExcerptOutput = RenderOutput & {
  /**
   * Whether the tree holds the node asked for. `false` comes with a null
   * element and an `excerpt-absent` diagnostic; it is here because it is the
   * one thing every caller branches on, and scanning a diagnostic array to
   * decide whether to render a fallback is worse than being told.
   */
  readonly found: boolean
}

/**
 * Part of a tree, rendered on its own and wearing the tree's theme.
 *
 * A preview, an inspector and a side-by-side are all the same shape: one node of
 * a page, shown somewhere that is not the page. Rendering one by hand loses the
 * theme silently. 0049 mounts a theme on the *root primitive* — `loom.page` puts
 * the variables on its own element — so a walk that starts anywhere else hands
 * `var(--loom-…)` to a subtree with nothing above it to resolve them, and
 * `resolveTheme` is right to call that node unthemed. Nothing is wrong; there is
 * simply no theme, and no diagnostic says so because none is owed.
 *
 * So the seam mounts it, on an element of its own around the excerpt:
 *
 * - **The excerpt is self-contained.** It carries the variables it references,
 *   whichever node it starts from, and can be dropped into a page that owns a
 *   different theme or none at all.
 * - **The wrapper is always there and always carries the theme**, the root
 *   included. An excerpt of the root then mounts the same variables twice, on
 *   nested elements, which is the same values by construction — and the rule a
 *   caller can hold is *the excerpt carries its theme* rather than *the excerpt
 *   carries its theme unless you asked for the node that carries it already*.
 *
 * Everything else is the page render: the same walk, the same resolvers, the
 * same diagnostics. The excerpt's root is not the tree's root, so it does not
 * receive the root's `theme` prop, its editable attributes name no tree, and a
 * `loom:theme` sitting on it is `theme-misplaced` — all of which is what those
 * rules already say, applied to a node that is not the root.
 */
export const renderLoomExcerpt = (
  tree: LoomTree,
  nodeId: NodeId,
  options: RenderOptions
): ExcerptOutput => {
  const diagnostics: RenderDiagnostic[] = []
  const collect = (diagnostic: RenderDiagnostic): void => {
    diagnostics.push(diagnostic)
  }

  const from = findNode(tree.root, nodeId)

  if (!from) {
    collect({ code: "excerpt-absent", nodeId })

    return { element: null, diagnostics, found: false }
  }

  const { element, theme } = renderFrom(tree, from, options, collect)

  return {
    element: createElement(
      "div",
      { style: theme ? themeStyle(theme) : undefined },
      element
    ),
    diagnostics,
    found: true,
    ...(theme ? { theme } : {}),
  }
}
