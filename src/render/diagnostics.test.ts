import { describe, expect, it } from "vitest"

import { nodeIdSchema } from "../ids.js"
import { primitiveTypeSchema } from "../primitive-type.js"

import { describeRenderDiagnostic } from "./diagnostics.js"

describe("describeRenderDiagnostic", () => {
  it("names the primitive, the node, and what happened to it", () => {
    const described = describeRenderDiagnostic({
      code: "unknown-primitive",
      nodeId: nodeIdSchema.parse("n_1"),
      type: primitiveTypeSchema.parse("commerce.buy-button"),
    })

    expect(described).toContain("commerce.buy-button")
    expect(described).toContain("n_1")
    expect(described).toContain("omitted")
  })

  it("quotes every prop issue behind an omitted node", () => {
    const described = describeRenderDiagnostic({
      code: "invalid-props",
      nodeId: nodeIdSchema.parse("n_2"),
      type: primitiveTypeSchema.parse("loom.card"),
      issues: [
        { path: "variant", message: "Invalid enum value" },
        { path: "elevation", message: "Expected number" },
      ],
    })

    expect(described).toContain("n_2")
    expect(described).toContain("variant: Invalid enum value")
    expect(described).toContain("elevation: Expected number")
    expect(described).toContain("omitted")
  })

  it("says an unchecked node rendered anyway, so the two are not confused", () => {
    const described = describeRenderDiagnostic({
      code: "props-undeclared",
      nodeId: nodeIdSchema.parse("n_3"),
      type: primitiveTypeSchema.parse("loom.card"),
    })

    expect(described).toContain("unchecked")
    expect(described).not.toContain("omitted")
  })
})
