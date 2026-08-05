import { z } from "zod"

import { nodeIdSchema, type NodeId } from "../ids.js"
import { jsonObjectSchema, type JsonObject } from "../json.js"
import { assertNever } from "../result.js"
import { primitiveTypeSchema, slotNameSchema, type PrimitiveType, type SlotName } from "../primitive-type.js"

/**
 * The component AST.
 *
 * Three node kinds, discriminated on `kind`:
 *
 * - `element` — an instance of a registered primitive. Carries props and an
 *   ordered child list. This is the only kind that composes.
 * - `text`    — a leaf string. Text is a node rather than a prop so that the
 *   runtime can address, move, and re-author a sentence the same way it
 *   addresses a card.
 * - `slot`    — a named region a host or parent primitive projects into. Its
 *   children are the fallback rendered when nothing is projected.
 *
 * Deliberately absent: a `fragment` kind (an element with no visual primitive
 * is expressible as a registered `fragment` primitive, and a second way to
 * express the same thing complicates every traversal) and conditional or
 * looping nodes (adaptation happens by proposing a delta, not by embedding
 * control flow the Gate cannot reason about).
 */

export type ElementNode = {
  readonly kind: "element"
  readonly id: NodeId
  readonly type: PrimitiveType
  readonly props: JsonObject
  readonly children: readonly LoomNode[]
}

export type TextNode = {
  readonly kind: "text"
  readonly id: NodeId
  readonly value: string
}

export type SlotNode = {
  readonly kind: "slot"
  readonly id: NodeId
  readonly name: SlotName
  readonly children: readonly LoomNode[]
}

export type LoomNode = ElementNode | TextNode | SlotNode

export type NodeKind = LoomNode["kind"]

export const loomNodeSchema: z.ZodType<LoomNode, z.ZodTypeDef, unknown> = z.lazy(() =>
  z.discriminatedUnion("kind", [elementNodeSchema, textNodeSchema, slotNodeSchema])
)

export const elementNodeSchema = z.object({
  kind: z.literal("element"),
  id: nodeIdSchema,
  type: primitiveTypeSchema,
  props: jsonObjectSchema,
  children: z.array(loomNodeSchema).readonly(),
})

export const textNodeSchema = z.object({
  kind: z.literal("text"),
  id: nodeIdSchema,
  value: z.string(),
})

export const slotNodeSchema = z.object({
  kind: z.literal("slot"),
  id: nodeIdSchema,
  name: slotNameSchema,
  children: z.array(loomNodeSchema).readonly(),
})

/** Text is a leaf; every other kind holds an ordered child list. */
export const isContainerNode = (node: LoomNode): node is ElementNode | SlotNode =>
  node.kind !== "text"

export const childrenOf = (node: LoomNode): readonly LoomNode[] =>
  isContainerNode(node) ? node.children : []

/**
 * The node's own name, which is the only thing a reader recognises it by. Ids
 * are minted and carry no meaning, so anything reported to a person names the
 * node as well as addressing it.
 */
export const nodeLabel = (node: LoomNode): string => {
  switch (node.kind) {
    case "element":
      return node.type
    case "slot":
      return node.name
    case "text":
      return "text"
    default:
      return assertNever(node, "nodeLabel")
  }
}

export const withChildren = <TNode extends ElementNode | SlotNode>(
  node: TNode,
  children: readonly LoomNode[]
): TNode => ({ ...node, children })
