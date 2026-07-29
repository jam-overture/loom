import { describe, expect, it } from "vitest"

import { primitiveTypeSchema } from "../primitive-type.js"
import { testPrimitives } from "../testing/primitives.js"

import { staticPrimitiveResolver } from "./primitive.js"

describe("staticPrimitiveResolver", () => {
  it("resolves a registered type", () => {
    const resolver = staticPrimitiveResolver(testPrimitives)

    expect(resolver.resolve(primitiveTypeSchema.parse("loom.card"))).toBe(testPrimitives["loom.card"])
  })

  it("answers undefined for a type nobody registered", () => {
    const resolver = staticPrimitiveResolver(testPrimitives)

    expect(resolver.resolve(primitiveTypeSchema.parse("commerce.buy-button"))).toBeUndefined()
  })

  it("does not resolve inherited object properties", () => {
    const resolver = staticPrimitiveResolver({})

    expect(resolver.resolve(primitiveTypeSchema.parse("constructor"))).toBeUndefined()
  })
})
