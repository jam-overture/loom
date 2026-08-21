import { describe, expect, it } from "vitest"
import { z } from "zod"

import { catalogueFields, closedChoices } from "./catalogue.js"

describe("catalogueFields", () => {
  it("names every declared prop and whether it is required", () => {
    const schema = z.object({ label: z.string(), hint: z.string().optional() })

    expect(catalogueFields(schema)).toEqual([
      { name: "hint", required: false },
      { name: "label", required: true },
    ])
  })

  it("answers that it cannot tell rather than that there are none", () => {
    expect(catalogueFields(z.string())).toBeUndefined()
  })
})

/**
 * The values the conformance probe may vary without inventing any (0075).
 */
describe("closedChoices", () => {
  it("lists an enum's members, and both values of a boolean", () => {
    const schema = z.object({
      kind: z.enum(["text", "select"]),
      required: z.boolean(),
    })

    expect(closedChoices(schema)).toEqual([
      { name: "kind", options: ["text", "select"] },
      { name: "required", options: [false, true] },
    ])
  })

  it("looks through the wrappers that change presence rather than value", () => {
    const enumeration = z.enum(["a", "b"])
    const schema = z.object({
      optional: enumeration.optional(),
      defaulted: enumeration.default("a"),
      nullable: enumeration.nullable(),
    })

    expect(closedChoices(schema).map((choice) => choice.options)).toEqual([
      ["a", "b"],
      ["a", "b"],
      ["a", "b"],
    ])
  })

  it("says nothing about a prop whose values cannot be listed", () => {
    const schema = z.object({
      label: z.string(),
      weight: z.number(),
      href: z.string().url().optional(),
      meta: z.record(z.string(), z.string()),
    })

    expect(closedChoices(schema)).toEqual([])
  })

  it("reads through a cross-field refinement, like the catalogue does", () => {
    const schema = z
      .object({ span: z.enum(["column", "row"]).optional(), label: z.string().optional() })
      .refine((value) => value.span !== "row" || value.label !== undefined, {
        message: "a full-width field needs a label",
      })

    expect(closedChoices(schema)).toEqual([{ name: "span", options: ["column", "row"] }])
  })

  it("has nothing to say about a schema whose keys cannot be enumerated", () => {
    expect(closedChoices(z.string())).toEqual([])
  })

  it("sorts by prop name, so the configurations a probe builds are stable", () => {
    const schema = z.object({
      zeta: z.boolean(),
      alpha: z.enum(["one"]),
    })

    expect(closedChoices(schema).map((choice) => choice.name)).toEqual(["alpha", "zeta"])
  })
})
