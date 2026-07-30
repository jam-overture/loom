import { describe, expect, it } from "vitest"

import type { JsonObject, JsonValue } from "../json.js"
import {
  CONFIGURE_CARD_REPLY,
  INSERT_NOTE_REPLY,
  NOT_UNDERSTOOD_REPLY,
  NO_CHANGE_REPLY,
} from "../testing/model-replies.js"

import { interpretationReplySchema } from "./draft.js"
import {
  DEFAULT_DRAFT_DEPTH,
  draftSchemaByteSize,
  GRAMMAR_BUDGET_BYTES,
  interpretationReplyJsonSchema,
} from "./schema.js"

const isJsonObject = (value: JsonValue | undefined): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const childValues = (value: JsonObject): readonly JsonValue[] =>
  Object.keys(value).map((key) => value[key] as JsonValue)

const everyObjectSchema = (value: JsonValue): readonly JsonObject[] => {
  if (Array.isArray(value)) return value.flatMap(everyObjectSchema)
  if (!isJsonObject(value)) return []

  const nested = childValues(value).flatMap(everyObjectSchema)

  return value["type"] === "object" ? [value, ...nested] : nested
}

const maximumNodeDepth = (value: JsonValue): number => {
  if (Array.isArray(value)) return Math.max(0, ...value.map(maximumNodeDepth))
  if (!isJsonObject(value)) return 0

  const nested = Math.max(0, ...childValues(value).map(maximumNodeDepth))
  const properties = value["properties"] ?? null
  const isNode = isJsonObject(properties) && "kind" in properties

  return isNode ? nested + 1 : nested
}

describe("interpretationReplyJsonSchema", () => {
  it("closes every object, which structured output requires", () => {
    const schemas = everyObjectSchema(interpretationReplyJsonSchema())

    expect(schemas.length).toBeGreaterThan(0)
    for (const schema of schemas) {
      expect(schema["additionalProperties"]).toBe(false)
      expect(schema["required"]).toEqual(Object.keys(schema["properties"] as JsonObject))
    }
  })

  it("unrolls nesting to the requested depth rather than recursing", () => {
    expect(maximumNodeDepth(interpretationReplyJsonSchema(1))).toBe(1)
    expect(maximumNodeDepth(interpretationReplyJsonSchema(3))).toBe(3)
    expect(maximumNodeDepth(interpretationReplyJsonSchema())).toBe(DEFAULT_DRAFT_DEPTH)
  })

  /**
   * The offline half of 0014's guard. The live smoke test is the authority on
   * where the real ceiling sits; this one fails on the commit that pushes the
   * schema past it, with no key and no network, which is the only way a
   * regression gets caught before a deploy.
   */
  it("stays inside the compiled-grammar budget", () => {
    expect(draftSchemaByteSize()).toBeLessThanOrEqual(GRAMMAR_BUDGET_BYTES)
  })

  it("keeps the budget guard below the measured rejection boundary", () => {
    expect(GRAMMAR_BUDGET_BYTES).toBeLessThan(4136)
  })

  /** The repetition that broke it: props must cost one production, not a union. */
  it("spends one string on a node's props rather than a variant per JSON type", () => {
    const element = (interpretationReplyJsonSchema(2)["anyOf"] as readonly JsonObject[])[0]
    const operations = ((element?.["properties"] as JsonObject)["operations"] as JsonObject)["items"]
    const insert = ((operations as JsonObject)["anyOf"] as readonly JsonObject[])[0]
    const node = (insert?.["properties"] as JsonObject)["node"] as JsonObject
    const elementNode = (node["anyOf"] as readonly JsonObject[])[0]

    expect((elementNode?.["properties"] as JsonObject)["props"]).toEqual({ type: "string" })
    expect(JSON.stringify(interpretationReplyJsonSchema())).not.toContain('"const":"json"')
  })

  it("offers element and text as insertable kinds, and not slot", () => {
    const serialized = JSON.stringify(interpretationReplyJsonSchema())

    expect(serialized).toContain('"const":"element"')
    expect(serialized).toContain('"const":"text"')
    expect(serialized).not.toContain('"const":"slot"')
  })

  it("bottoms out at a leaf, so the deepest level cannot hold children", () => {
    const serialized = JSON.stringify(interpretationReplyJsonSchema(1))

    expect(serialized).toContain('"const":"text"')
    expect(serialized).not.toContain('"const":"element"')
  })

  /**
   * Structured output accepts a subset of JSON Schema. A keyword outside it is
   * rejected by the API rather than ignored, and only at request time — so the
   * allowlist is asserted here, where a future edit trips over it immediately.
   */
  it("uses only keywords structured output accepts", () => {
    const allowed = new Set([
      "type",
      "properties",
      "required",
      "additionalProperties",
      "anyOf",
      "items",
      "const",
      "description",
    ])

    /** Walks schema positions only, so property *names* are never read as keywords. */
    const keywords = (schema: JsonObject): readonly string[] => {
      const properties = schema["properties"]
      const items = schema["items"]
      const anyOf = schema["anyOf"]

      const nested: readonly JsonValue[] = [
        ...(isJsonObject(properties) ? childValues(properties) : []),
        ...(items === undefined ? [] : [items]),
        ...(Array.isArray(anyOf) ? anyOf : []),
      ]

      return [...Object.keys(schema), ...nested.filter(isJsonObject).flatMap(keywords)]
    }

    const unsupported = keywords(interpretationReplyJsonSchema()).filter((key) => !allowed.has(key))

    expect(unsupported).toEqual([])
  })

  it("offers exactly the three outcomes", () => {
    const outcomes = (interpretationReplyJsonSchema()["anyOf"] as readonly JsonObject[]).map(
      (variant) => ((variant["properties"] as JsonObject)["outcome"] as JsonObject)["const"]
    )

    expect(outcomes).toEqual(["change", "no-change", "not-understood"])
  })

  /**
   * The JSON Schema is hand-written and the draft schema is Zod, so the two can
   * drift. Every fixture reply is written against the JSON Schema and asserted
   * against Zod, which is what makes drift visible.
   */
  it("agrees with the draft schema on every recorded reply", () => {
    for (const reply of [INSERT_NOTE_REPLY, CONFIGURE_CARD_REPLY, NO_CHANGE_REPLY, NOT_UNDERSTOOD_REPLY]) {
      expect(interpretationReplySchema.safeParse(JSON.parse(reply)).success).toBe(true)
    }
  })
})
