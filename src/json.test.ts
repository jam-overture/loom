import { describe, expect, it } from "vitest"

import { jsonObjectSchema, jsonValueSchema } from "./json.js"

describe("jsonValueSchema", () => {
  it("accepts the JSON value space, including nesting", () => {
    expect(jsonValueSchema.safeParse({ a: [1, "two", true, null, { b: {} }] }).success).toBe(true)
  })

  it("rejects values that cannot round-trip through JSON", () => {
    expect(jsonValueSchema.safeParse(undefined).success).toBe(false)
    expect(jsonValueSchema.safeParse(() => null).success).toBe(false)
    expect(jsonValueSchema.safeParse(new Date()).success).toBe(false)
    expect(jsonValueSchema.safeParse(Number.NaN).success).toBe(false)
    expect(jsonValueSchema.safeParse(Number.POSITIVE_INFINITY).success).toBe(false)
  })

  it("rejects an object with an undefined member", () => {
    expect(jsonObjectSchema.safeParse({ a: undefined }).success).toBe(false)
  })
})
