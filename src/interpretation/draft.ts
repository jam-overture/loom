import { z } from "zod"

import { nodeIdSchema } from "../ids.js"
import { primitiveTypeSchema, type PrimitiveType } from "../primitive-type.js"

/**
 * What a model is allowed to say.
 *
 * A draft is the tree schema with three things taken away. Inserted nodes carry
 * no `id`, because identity is minted by the runtime and never by the proposer.
 * Props arrive as one JSON-encoded object rather than a typed structure, and the
 * node kinds an insert may introduce are element and text only. None of this
 * changes the AST — a draft is a projection of it, and `materializeDelta` is the
 * inverse projection.
 *
 * The last two are not aesthetic choices. Structured output compiles the emitted
 * schema into a grammar with a size ceiling, and the typed prop union 0004
 * specified — repeated at every element at every level — put the schema four
 * times over that ceiling, so no live call ever succeeded. Measured and adopted
 * in 0014, which supersedes 0004.
 */

/**
 * A JSON-encoded object of props: `{"tone":"quiet","count":2}`.
 *
 * A string costs the compiled grammar one production no matter how many props it
 * carries or how deeply their values nest, which is what buys back the nesting
 * depth. Nothing is trusted about the contents: `materializeDelta` parses it,
 * requires an object, and validates every value against the JSON value space, so
 * a malformed bag is a `malformed-proposal` rather than something that reaches a
 * tree.
 */
export const draftPropsSchema = z.string()

export type DraftNode =
  | {
      readonly kind: "element"
      readonly type: PrimitiveType
      readonly props: string
      readonly children: readonly DraftNode[]
    }
  | { readonly kind: "text"; readonly value: string }

/**
 * `slot` is absent on purpose. A slot is a projection region a primitive
 * declares, not content an edit adds — §4's catalogue tells a model which slots
 * a primitive has, and slots already in a tree stay addressable, configurable,
 * and projectable. Dropping the third variant is also part of what keeps depth 4
 * affordable.
 */
export const draftNodeSchema: z.ZodType<DraftNode, z.ZodTypeDef, unknown> = z.lazy(() =>
  z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("element"),
      type: primitiveTypeSchema,
      props: draftPropsSchema,
      children: z.array(draftNodeSchema).readonly(),
    }),
    z.object({ kind: z.literal("text"), value: z.string() }),
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
    set: draftPropsSchema,
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
