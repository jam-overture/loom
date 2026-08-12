import type { ComponentType, CSSProperties, ReactNode } from "react"

import type { NodeId } from "../ids.js"
import type { JsonObject, JsonObjectView } from "../json.js"
import type { PrimitiveType } from "../primitive-type.js"

import type { EditableAttributes } from "./editable.js"

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

export type LoomRenderContext = {
  readonly nodeId: NodeId
  readonly type: PrimitiveType
  /**
   * Present only when the tree was rendered in edit mode. Spread onto the
   * primitive's own root element; a primitive that drops it renders correctly
   * but becomes invisible to the portal.
   */
  readonly editable?: EditableAttributes
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
export type LoomPrimitiveProps<TProps extends JsonObjectView = JsonObject> = {
  readonly loom: LoomRenderContext
  /** The node's props, exactly as they appear in the tree. */
  readonly props: TProps
  /** Rendered children in tree order, or null when the node has none. */
  readonly children: ReactNode
}

export type LoomPrimitive<TProps extends JsonObjectView = JsonObject> = ComponentType<
  LoomPrimitiveProps<TProps>
>

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
