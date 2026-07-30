import type { JsonObject } from "../json.js"

/**
 * The JSON Schema handed to the model, hand-written rather than derived from
 * the Zod draft schema, because structured output accepts a strict subset of
 * JSON Schema: every object must close over its properties, and recursive
 * definitions are not allowed.
 *
 * Nesting is therefore unrolled to a fixed depth. That is a limit on how much
 * structure one proposal may introduce at once, not a limit on the tree: a
 * deeper subtree is built by a second insert against the node the first one
 * created. `draft.ts` stays fully recursive, so a deeper reply that somehow
 * arrives still validates.
 *
 * There is a second constraint, and it is the one that bites: the service
 * compiles this schema into a grammar and refuses anything whose compiled form
 * is too large. It is not a documented number and it is not proportional to
 * anything obvious — it tracks the serialised size of the schema closely enough
 * that size is the practical proxy. 0014 has the measurements.
 */

export const DEFAULT_DRAFT_DEPTH = 4

/**
 * The size guard, in bytes of serialised schema.
 *
 * Measured on 2026-07-30: every variant at or below 3681 bytes was accepted and
 * every variant at or above 4136 was rejected. This sits below that band with
 * room to spare, so it fails before the API does — a schema that grows past it
 * is a change someone has to look at, not a 400 in production.
 *
 * It is a guard rail, not the boundary. The boundary is undocumented, belongs to
 * the service, and can move; only `anthropic.smoke.test.ts` can tell us where it
 * actually is today.
 */
export const GRAMMAR_BUDGET_BYTES = 3500

const closedObject = (properties: JsonObject): JsonObject => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
})

const constant = (value: string): JsonObject => ({ type: "string", const: value })

/**
 * Descriptions are kept terse on purpose. Every one of them is repeated at every
 * level of the unrolled schema, so a helpful sentence here costs a multiple of
 * itself in budget — and the system prompt already explains ids, indices, and the
 * prop encoding at length, to the same model, in the same request.
 */

/** Ids are copied from the rendered tree; the regex lives in `nodeIdSchema`. */
const nodeIdProperty: JsonObject = { type: "string", description: "id copied from the tree" }

const indexProperty: JsonObject = { type: "integer", description: "0-based" }

/**
 * One string, not a structure. A typed prop union repeats at every element at
 * every level of the unrolled schema, and that repetition — not the depth — is
 * what put the old schema four times over the grammar budget (0014).
 */
const propsProperty: JsonObject = { type: "string" }

const textNodeSchema: JsonObject = closedObject({
  kind: constant("text"),
  value: { type: "string" },
})

/** Depth 1 is a leaf: the only node kind that cannot hold children. */
const nodeSchema = (depth: number): JsonObject => {
  if (depth <= 1) return textNodeSchema

  const children: JsonObject = { type: "array", items: nodeSchema(depth - 1) }

  return {
    anyOf: [
      closedObject({
        kind: constant("element"),
        type: { type: "string", description: "e.g. loom.card" },
        props: propsProperty,
        children,
      }),
      textNodeSchema,
    ],
  }
}

const operationSchema = (depth: number): JsonObject => ({
  anyOf: [
    closedObject({
      op: constant("insert"),
      parentId: nodeIdProperty,
      index: indexProperty,
      node: nodeSchema(depth),
    }),
    closedObject({ op: constant("remove"), nodeId: nodeIdProperty }),
    closedObject({
      op: constant("move"),
      nodeId: nodeIdProperty,
      parentId: nodeIdProperty,
      index: indexProperty,
    }),
    closedObject({
      op: constant("configure"),
      nodeId: nodeIdProperty,
      set: propsProperty,
      unset: { type: "array", items: { type: "string" } },
    }),
  ],
})

export const interpretationReplyJsonSchema = (depth: number = DEFAULT_DRAFT_DEPTH): JsonObject => ({
  anyOf: [
    closedObject({
      outcome: constant("change"),
      rationale: { type: "string", description: "why these operations satisfy the intent" },
      confidence: { type: "number", description: "0 to 1" },
      operations: { type: "array", items: operationSchema(depth) },
    }),
    closedObject({
      outcome: constant("no-change"),
      rationale: { type: "string", description: "why the tree already satisfies it" },
    }),
    closedObject({
      outcome: constant("not-understood"),
      rationale: { type: "string", description: "what was ambiguous or unsupported" },
    }),
  ],
})

/**
 * The serialised size of the emitted schema, which is what the budget is
 * asserted against offline. Bytes rather than characters: the description
 * strings are the part most likely to grow, and the part most likely to grow
 * a non-ASCII character.
 */
export const draftSchemaByteSize = (depth: number = DEFAULT_DRAFT_DEPTH): number =>
  new TextEncoder().encode(JSON.stringify(interpretationReplyJsonSchema(depth))).length
