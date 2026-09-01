import type { ComponentType, CSSProperties, ReactNode } from "react"

import type { NodeData } from "../data/resolution.js"
import type { NodeFrames } from "../frame/resolution.js"
import type { NodeId } from "../ids.js"
import type { JsonObject, JsonObjectView } from "../json.js"
import type { PrimitiveType } from "../primitive-type.js"
import type { SubmissionOutcome } from "../submit/resolution.js"

import type { AnchorAttributes } from "./anchor.js"
import type { BehaviourName, PrimitiveBehaviours } from "./behaviour.js"
import type { DecorativeChildren } from "./decorative.js"
import type { EditableAttributes } from "./editable.js"
import type { PrimitiveText } from "./text.js"

/**
 * The primitive contract — what a registered component receives, and the only
 * thing the renderer needs from a registry.
 *
 * Node props arrive as one bag rather than spread across the component's own
 * props. Props in a Loom tree are AI-authored and arrive from storage, so
 * spreading them would let a proposal reach `dangerouslySetInnerHTML`, `ref`,
 * or any other React-reserved name that a primitive forwards to a DOM element.
 * A bag means a primitive reads what it declares and nothing else can be
 * smuggled past it.
 */

export type LoomRenderContext<
  TText extends string = never,
  TBehaviour extends BehaviourName = never,
> = {
  readonly nodeId: NodeId
  readonly type: PrimitiveType
  /**
   * Present only when the tree was rendered in edit mode. Spread onto the
   * primitive's own root element; a primitive that drops it renders correctly
   * but becomes invisible to the portal.
   */
  readonly editable?: EditableAttributes
  /**
   * The `id` this node answers to, so a link on the same page can point at it.
   *
   * Present only when the tree named an anchor that is usable and that no
   * earlier node claimed; absent otherwise, including inside a decorative copy,
   * which carries no identity. Spread onto the primitive's own root element,
   * beside `editable` — a primitive that drops it renders correctly and cannot
   * be linked to.
   *
   * There is nothing here to distinguish "the tree named none" from "the tree
   * named one and it was refused", which every other seam on this context takes
   * care to keep apart. The difference is real and it is in the diagnostics; it
   * is not here because a primitive would do the same thing with both, and a
   * shape that offers a choice nobody can act on invites one to be invented.
   */
  readonly anchor?: AnchorAttributes
  /**
   * The tree's theme, flattened into CSS custom properties. Present on the
   * **root node only**, and only when the tree names a theme the render could
   * resolve; apply it as `style` on the primitive's own root element.
   *
   * It arrives here rather than on a wrapper the renderer emits for the reason
   * `editable.ts` gives for the same choice: a wrapper changes what `>`,
   * `:first-child` and `:nth-child` select, and a page that only lays out
   * correctly when it is unthemed is not a page anyone reviewed. The cost is
   * that a root primitive which drops it renders unstyled — which is what the
   * two starter palettes exist to catch.
   */
  readonly theme?: CSSProperties
  /**
   * The content of this element's own `slot` children, keyed by slot name — the
   * named regions the primitive declared and is responsible for placing.
   *
   * Always present, empty when the node has no slot children, so a primitive
   * reads `loom.slots.aside` without first proving the map exists. A slot the
   * primitive does not place renders nothing: that is what makes a region a
   * region rather than a position in `children` (0051).
   */
  readonly slots: SlotChildren
  /**
   * What the host answered for this node's bindings, by binding name (0058).
   *
   * Always present, empty when the node binds nothing, so a primitive reads
   * `loom.data.services` without first proving the map exists. Each answer is
   * `ready` or `unavailable` with a reason — never merely absent — because a
   * primitive shows different things for "you have no services yet" and "we
   * could not reach your services", and a shape that cannot tell them apart
   * guarantees it eventually shows the wrong one.
   *
   * It arrives beside `props` rather than merged into them because the two have
   * different authors. Props are in the tree, proposed by a model and weighed by
   * the Gate; data is the host's answer to a question the tree asked, and it
   * belongs to whoever runs the deployment.
   */
  readonly data: NodeData
  /**
   * Where this node's form posts, if it declared a submission (0065).
   *
   * Absent — not `unavailable` — when the node declared none: the three states
   * are distinct and a form primitive acts differently on each. Absent is a
   * tree that never said where to post, which is an authoring gap; `unavailable`
   * is a deployment that could not answer right now, which is not.
   *
   * Unlike `data`, `text` and `slots` there is at most one per node, because a
   * form posts to one place. Everything on a `ready` target is host-authored:
   * nothing about the address is in the tree, so nothing about it survives into
   * a delta, a revision, or the diff a reviewer reads.
   */
  readonly submit?: SubmissionOutcome
  /**
   * Whether the URLs this primitive said it frames may be framed (0094), by the
   * prop name that carried each one.
   *
   * Always present, empty for the primitive that declared no framable prop —
   * which is all but one of them — so a primitive reads `loom.frames.src`
   * without first proving the map exists. An entry appears for every declared
   * prop the node actually carries, so a primitive that has a `src` to frame
   * always has an answer about it, and one whose optional `src` was left out
   * has nothing to frame and no entry.
   *
   * Unlike `data` and `submit`, no part of this waits on anything: an allowlist
   * is a static fact about a deployment, so the check happens inside the walk
   * and there is nothing for a host to resolve first. What a host *does* have
   * to wire is the allowlist itself — absent, every frame is refused, because a
   * deployment that has not said whose documents it will run has not agreed to
   * run anybody's.
   */
  readonly frames: NodeFrames
  /**
   * The strings this primitive declared, resolved for this deployment.
   *
   * Always present and always complete: every key the primitive declared is
   * here, carrying the host's translation where there is one and the declared
   * string where there is not. A primitive reads `loom.text.excluded` and gets a
   * string, never `undefined` — a control whose accessible name went missing
   * because nobody translated it is the failure this seam exists to prevent.
   *
   * Empty for a primitive that declared none, and typed as such: `TText` is the
   * union of declared keys, so reading one that was never declared does not
   * compile.
   */
  readonly text: PrimitiveText<TText>
  /**
   * The controls this primitive declared, built and ready to place.
   *
   * Always present, empty for the primitive that declared none, so a primitive
   * reads `loom.behaviours.copy` without first proving the map exists — and
   * typed by what it declared, so reading one it did not ask for does not
   * compile.
   *
   * A behaviour is the one thing a primitive receives that **runs**: a copy
   * button is a click handler, and a click handler is not expressible in the
   * JSON a primitive's props are. It arrives already built rather than as a
   * component to configure, because there is nothing here for a tree, a model
   * or a primitive to get right or wrong — the strings came from the
   * primitive's own declarations and the content came from the tree. See
   * `behaviour.ts`.
   */
  readonly behaviours: PrimitiveBehaviours<TBehaviour>
  /**
   * This node's children again, rendered as a copy nothing resolves to a node —
   * for the arrangements that have to say the same content twice (see
   * `decorative.ts`).
   *
   * Always present, and cheap to ignore: nothing is rendered until it is
   * called, so the primitives that will never want a copy pay one closure for
   * it. Calling it twice within one render returns the same elements.
   *
   * The copy is not marked and is not inert. It carries no identity, which is
   * the half the primitive could not arrange for itself; announcing it as
   * decoration — `aria-hidden`, `inert` — is the half the seam cannot.
   */
  readonly decorative: DecorativeChildren
}

/**
 * Rendered slot content, by slot name.
 *
 * The map has a null prototype. Slot names are lowercase identifiers and
 * `constructor`, `toString` and `valueOf` are all valid ones, so an ordinary
 * object would answer `loom.slots.constructor` with a function off
 * `Object.prototype` — the same hazard `staticPrimitiveResolver` guards, and
 * the same fix.
 */
export type SlotChildren = Readonly<Record<string, ReactNode>>

export const NO_SLOTS: SlotChildren = Object.freeze(
  Object.create(null) as Record<string, ReactNode>
)

/**
 * `TProps` is what a primitive's declared schema accepts. It defaults to the
 * whole JSON object space, so a primitive that declares nothing — or a host
 * that registers without §4's SDK — is still a `LoomPrimitive`. A narrower
 * `TProps` is a claim about what the bag contains, and the only thing that
 * makes the claim true is the render seam validating against the same schema
 * the type came from; that pairing is the registry's job (see `sdk/registry.ts`).
 */
export type LoomPrimitiveProps<
  TProps extends JsonObjectView = JsonObject,
  TText extends string = never,
  TBehaviour extends BehaviourName = never,
> = {
  readonly loom: LoomRenderContext<TText, TBehaviour>
  /** The node's props, exactly as they appear in the tree. */
  readonly props: TProps
  /** Rendered children in tree order, or null when the node has none. */
  readonly children: ReactNode
}

export type LoomPrimitive<
  TProps extends JsonObjectView = JsonObject,
  TText extends string = never,
  TBehaviour extends BehaviourName = never,
> = ComponentType<LoomPrimitiveProps<TProps, TText, TBehaviour>>

/**
 * The renderer's whole dependency on the registry: one lookup. §4 owns
 * registration — declared prop schemas, packaging, scaffolding — and whatever
 * it grows into has to satisfy no more than this to be renderable.
 */
export interface PrimitiveResolver {
  readonly resolve: (type: PrimitiveType) => LoomPrimitive | undefined
}

/**
 * A resolver over a fixed map, for hosts that register at module scope.
 *
 * The lookup is own-property only. A primitive type is a lowercase identifier
 * and `constructor`, `toString`, and `valueOf` are all valid ones, so a plain
 * index would answer a tree that names them with a function off
 * `Object.prototype` — an AI-authored type resolving to a native function is
 * not a lookup miss anyone would debug quickly.
 */
export const staticPrimitiveResolver = (
  primitives: Readonly<Record<string, LoomPrimitive>>
): PrimitiveResolver => ({
  resolve: (type) => (Object.hasOwn(primitives, type) ? primitives[type] : undefined),
})
