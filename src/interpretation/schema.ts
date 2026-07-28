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
 */

export const DEFAULT_DRAFT_DEPTH = 4

const closedObject = (properties: JsonObject): JsonObject => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
})

const constant = (value: string): JsonObject => ({ type: "string", const: value })

/** Ids are copied from the rendered tree; the regex lives in `nodeIdSchema`. */
const nodeIdProperty: JsonObject = { type: "string", description: "A node id copied exactly from the tree" }

const indexProperty: JsonObject = { type: "integer", description: "Position among the parent's children, 0-based" }

const propValueSchema: JsonObject = {
  anyOf: [
    closedObject({ kind: constant("string"), string: { type: "string" } }),
    closedObject({ kind: constant("number"), number: { type: "number" } }),
    closedObject({ kind: constant("boolean"), boolean: { type: "boolean" } }),
    closedObject({ kind: constant("null") }),
    closedObject({
      kind: constant("json"),
      json: { type: "string", description: "A JSON-encoded array or object" },
    }),
  ],
}

const propSchema: JsonObject = closedObject({ key: { type: "string" }, value: propValueSchema })

const propsArray: JsonObject = { type: "array", items: propSchema }

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
        type: { type: "string", description: "A dot-namespaced primitive type, e.g. loom.card" },
        props: propsArray,
        children,
      }),
      textNodeSchema,
      closedObject({
        kind: constant("slot"),
        name: { type: "string", description: "camelCase slot name" },
        children,
      }),
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
      set: propsArray,
      unset: { type: "array", items: { type: "string" } },
    }),
  ],
})

export const interpretationReplyJsonSchema = (depth: number = DEFAULT_DRAFT_DEPTH): JsonObject => ({
  anyOf: [
    closedObject({
      outcome: constant("change"),
      rationale: { type: "string", description: "Why these operations satisfy the intent" },
      confidence: { type: "number", description: "0 to 1, how sure you are this satisfies the intent" },
      operations: { type: "array", items: operationSchema(depth) },
    }),
    closedObject({
      outcome: constant("no-change"),
      rationale: { type: "string", description: "Why the tree already satisfies the intent" },
    }),
    closedObject({
      outcome: constant("not-understood"),
      rationale: { type: "string", description: "What was ambiguous or unsupported" },
    }),
  ],
})
