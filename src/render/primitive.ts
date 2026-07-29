import type { ComponentType, ReactNode } from "react"

import type { NodeId } from "../ids.js"
import type { JsonObject } from "../json.js"
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
}

export type LoomPrimitiveProps = {
  readonly loom: LoomRenderContext
  /** The node's props, exactly as they appear in the tree. */
  readonly props: JsonObject
  /** Rendered children in tree order, or null when the node has none. */
  readonly children: ReactNode
}

export type LoomPrimitive = ComponentType<LoomPrimitiveProps>

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
