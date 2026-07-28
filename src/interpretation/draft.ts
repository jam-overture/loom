import { z } from "zod"

import { nodeIdSchema } from "../ids.js"
import { primitiveTypeSchema, slotNameSchema, type PrimitiveType, type SlotName } from "../primitive-type.js"

/**
 * What a model is allowed to say.
 *
 * A draft is the tree schema with three things taken away. Inserted nodes carry
 * no `id`, because identity is minted by the runtime and never by the proposer.
 * Prop values are tagged rather than free-form JSON, and nesting is bounded in
 * the emitted JSON Schema, because structured output cannot express an open
 * object or a recursive definition. None of this changes the AST — a draft is a
 * projection of it, and `materializeDelta` is the inverse projection.
 */

/**
 * Tagged so that every value has exactly one spelling. `json` is the escape
 * hatch for arrays and objects, which a closed schema cannot describe directly.
 */
export const draftPropValueSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("string"), string: z.string() }),
  z.object({ kind: z.literal("number"), number: z.number().finite() }),
  z.object({ kind: z.literal("boolean"), boolean: z.boolean() }),
  z.object({ kind: z.literal("null") }),
  z.object({ kind: z.literal("json"), json: z.string() }),
])
export type DraftPropValue = z.infer<typeof draftPropValueSchema>

export const draftPropSchema = z.object({
  key: z.string().min(1),
  value: draftPropValueSchema,
})
export type DraftProp = z.infer<typeof draftPropSchema>

export type DraftNode =
  | {
      readonly kind: "element"
      readonly type: PrimitiveType
      readonly props: readonly DraftProp[]
      readonly children: readonly DraftNode[]
    }
  | { readonly kind: "text"; readonly value: string }
  | { readonly kind: "slot"; readonly name: SlotName; readonly children: readonly DraftNode[] }

export const draftNodeSchema: z.ZodType<DraftNode, z.ZodTypeDef, unknown> = z.lazy(() =>
  z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("element"),
      type: primitiveTypeSchema,
      props: z.array(draftPropSchema).readonly(),
      children: z.array(draftNodeSchema).readonly(),
    }),
    z.object({ kind: z.literal("text"), value: z.string() }),
    z.object({
      kind: z.literal("slot"),
      name: slotNameSchema,
      children: z.array(draftNodeSchema).readonly(),
    }),
  ])
)

export const draftOperationSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("insert"),
    parentId: nodeIdSchema,
    index: z.number().int().nonnegative(),
    node: draftNodeSchema,
  }),
  z.object({ op: z.literal("remove"), nodeId: nodeIdSchema }),
  z.object({
    op: z.literal("move"),
    nodeId: nodeIdSchema,
    parentId: nodeIdSchema,
    index: z.number().int().nonnegative(),
  }),
  z.object({
    op: z.literal("configure"),
    nodeId: nodeIdSchema,
    set: z.array(draftPropSchema).readonly(),
    unset: z.array(z.string()).readonly(),
  }),
])
export type DraftOperation = z.infer<typeof draftOperationSchema>

/**
 * The reply is a three-way outcome rather than a delta, because "I understood
 * you and nothing needs to change" and "I did not understand you" are answers,
 * not failures to answer. Both map onto an `InterpretationError` code; neither
 * is a rejected proposal.
 */
export const interpretationReplySchema = z.discriminatedUnion("outcome", [
  z.object({
    outcome: z.literal("change"),
    rationale: z.string().min(1),
    confidence: z.number().min(0).max(1),
    operations: z.array(draftOperationSchema).min(1).readonly(),
  }),
  z.object({ outcome: z.literal("no-change"), rationale: z.string().min(1) }),
  z.object({ outcome: z.literal("not-understood"), rationale: z.string().min(1) }),
])
export type InterpretationReply = z.infer<typeof interpretationReplySchema>
