import { describe, expect, it } from "vitest"

import {
  describePrimitiveRole,
  isPrimitiveRole,
  PRIMITIVE_ROLES,
  type PrimitiveRole,
} from "./role.js"

describe("PRIMITIVE_ROLES", () => {
  it("names every role", () => {
    expect(PRIMITIVE_ROLES).toEqual(["heading"])
  })

  it("describes every one of them, in a sentence that says something", () => {
    for (const role of PRIMITIVE_ROLES) {
      expect(describePrimitiveRole(role).trim().length).toBeGreaterThan(20)
    }
  })

  it("gives each role its own description", () => {
    const described = new Set(PRIMITIVE_ROLES.map(describePrimitiveRole))

    expect(described.size).toBe(PRIMITIVE_ROLES.length)
  })
})

describe("isPrimitiveRole", () => {
  it("accepts every member of the vocabulary", () => {
    for (const role of PRIMITIVE_ROLES) expect(isPrimitiveRole(role)).toBe(true)
  })

  it("refuses a string that is not one", () => {
    expect(isPrimitiveRole("title")).toBe(false)
    expect(isPrimitiveRole("Heading")).toBe(false)
    expect(isPrimitiveRole("")).toBe(false)
  })

  /**
   * The hazard `NO_SLOTS` and `staticPrimitiveResolver` guard in their own way:
   * a host's misspelling could land on something inherited rather than on a
   * member, and `includes` over a frozen array is what makes that impossible.
   */
  it("refuses a name off Object.prototype", () => {
    expect(isPrimitiveRole("constructor")).toBe(false)
    expect(isPrimitiveRole("toString")).toBe(false)
  })

  it("narrows, so a checked string is usable as a role", () => {
    const written = "heading"

    if (!isPrimitiveRole(written)) throw new Error("expected a role")

    const role: PrimitiveRole = written

    expect(describePrimitiveRole(role)).toContain("heads")
  })
})
