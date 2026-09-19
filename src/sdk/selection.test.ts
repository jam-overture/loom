import { describe, expect, it } from "vitest"

import { testDefinitions } from "../testing/definitions.js"

import { createPrimitiveRegistry } from "./registry.js"
import { describeSelectionError, selectPrimitives, type SelectionError } from "./selection.js"

const typesOf = (selected: ReturnType<typeof selectPrimitives>): readonly string[] => {
  if (!selected.ok) throw new Error(`expected a selection, got ${describeSelectionError(selected.error)}`)

  return selected.value.map((entry) => entry.type)
}

const refusalOf = (types: readonly string[]): SelectionError => {
  const selected = selectPrimitives(testDefinitions, types)
  if (selected.ok) throw new Error("expected the selection to be refused")

  return selected.error
}

describe("selectPrimitives", () => {
  it("takes the named entries and leaves the rest", () => {
    expect(typesOf(selectPrimitives(testDefinitions, ["loom.card", "loom.page"]))).toEqual([
      "loom.page",
      "loom.card",
    ])
  })

  it("keeps the library's order rather than the order the names were given in", () => {
    const chosen = ["loom.footer", "loom.header", "loom.page"]

    expect(typesOf(selectPrimitives(testDefinitions, chosen))).toEqual([
      "loom.page",
      "loom.header",
      "loom.footer",
    ])
  })

  it("selects everything when everything is named", () => {
    const all = testDefinitions.map((entry) => entry.type)

    expect(typesOf(selectPrimitives(testDefinitions, all))).toEqual(all)
  })

  it("selects nothing when nothing is named", () => {
    expect(typesOf(selectPrimitives(testDefinitions, []))).toEqual([])
  })

  /**
   * The failure the filter a host would otherwise write does not have. A name
   * nothing carries is a deployment quietly losing a primitive, discovered when
   * a page does not draw.
   */
  it("refuses a name the library does not carry", () => {
    expect(refusalOf(["loom.card", "loom.carrd"])).toEqual({
      code: "unregistered-types",
      types: ["loom.carrd"],
    })
  })

  it("names every missing type rather than the first", () => {
    expect(refusalOf(["loom.carrd", "loom.page", "loom.heading"]).types).toEqual([
      "loom.carrd",
      "loom.heading",
    ])
  })

  it("reports one missing name once, however many times it was asked for", () => {
    expect(refusalOf(["loom.carrd", "loom.carrd"]).types).toEqual(["loom.carrd"])
  })

  /**
   * A registry refuses a duplicate type, so a selection that passed a repeated
   * name through would turn a harmless repetition in a host's list into a
   * refusal two calls later.
   */
  it("selects one entry for a name given twice, so the registry it builds is buildable", () => {
    const selected = selectPrimitives(testDefinitions, ["loom.card", "loom.card"])
    if (!selected.ok) throw new Error("expected a selection")

    const registry = createPrimitiveRegistry(selected.value)
    if (!registry.ok) throw new Error("expected the registry to build")

    expect(registry.value.primitives.map((primitive) => primitive.type)).toEqual(["loom.card"])
  })

  it("builds a working registry from the slice", () => {
    const selected = selectPrimitives(testDefinitions, ["loom.page", "loom.card"])
    if (!selected.ok) throw new Error("expected a selection")

    const registry = createPrimitiveRegistry(selected.value)
    if (!registry.ok) throw new Error("expected the registry to build")

    expect(registry.value.resolve("loom.card" as never)).toBeDefined()
    expect(registry.value.resolve("loom.footer" as never)).toBeUndefined()
  })

  describe("describeSelectionError", () => {
    it("says what a single unregistered name means", () => {
      expect(describeSelectionError({ code: "unregistered-types", types: ["loom.carrd"] })).toContain(
        "is not a primitive in this library"
      )
    })

    it("reads as a plural when there are several", () => {
      const described = describeSelectionError({
        code: "unregistered-types",
        types: ["loom.carrd", "loom.heading"],
      })

      expect(described).toContain("are not primitives in this library")
      expect(described).toContain(`"loom.carrd", "loom.heading"`)
    })
  })
})
