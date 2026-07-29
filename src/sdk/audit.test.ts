import { createElement, useState } from "react"
import { describe, expect, it } from "vitest"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { registryOf, testDefinitions } from "../testing/definitions.js"

import { auditRegistry, describeRegistryAudit } from "./audit.js"
import { definePrimitive } from "./definition.js"

const silent = definePrimitive({
  type: "loom.silent",
  description: "renders, but never says which node it is",
  props: z.object({}),
  component: ({ children }: LoomPrimitiveProps) => createElement("div", null, children),
})

const hooked = definePrimitive({
  type: "loom.hooked",
  description: "decorates, but cannot be called outside a renderer",
  props: z.object({}),
  component: ({ loom, children }: LoomPrimitiveProps) => {
    const [open] = useState(false)

    return createElement("div", { ...loom.editable, "data-open": open }, children)
  },
})

describe("auditRegistry", () => {
  it("finds nothing to report for primitives that all decorate", () => {
    const audit = auditRegistry(registryOf(testDefinitions))

    expect(audit.audits).toHaveLength(testDefinitions.length)
    expect(audit.notDecorated).toEqual([])
    expect(audit.notProbeable).toEqual([])
  })

  it("names the primitive that will be invisible to the portal", () => {
    const audit = auditRegistry(registryOf([...testDefinitions, silent]))

    expect(audit.notDecorated).toEqual(["loom.silent"])
  })

  it("separates a primitive it could not judge from one that failed", () => {
    const audit = auditRegistry(registryOf([silent, hooked]))

    expect(audit.notDecorated).toEqual(["loom.silent"])
    expect(audit.notProbeable).toEqual(["loom.hooked"])
  })

  it("reports in registration order, one entry per primitive", () => {
    const audit = auditRegistry(registryOf([hooked, silent]))

    expect(audit.audits.map((entry) => entry.type)).toEqual(["loom.hooked", "loom.silent"])
  })
})

describe("describeRegistryAudit", () => {
  it("says of each primitive what the probe found", () => {
    const described = describeRegistryAudit(auditRegistry(registryOf([...testDefinitions, silent, hooked])))

    expect(described).toContain("loom.card: spreads loom.editable")
    expect(described).toContain("loom.silent: does not spread loom.editable")
    expect(described).toContain("loom.hooked: could not be probed")
  })
})
