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
})
