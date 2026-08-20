import { createElement, useState } from "react"
import { describe, expect, it } from "vitest"
import { z } from "zod"

import { primitiveTypeSchema } from "../primitive-type.js"
import type { LoomPrimitiveProps } from "../render/primitive.js"
import { registryOf, testDefinitions } from "../testing/definitions.js"

import { auditRegistry, decorationFromAudit, describeRegistryAudit } from "./audit.js"
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

const forgetful = definePrimitive({
  type: "loom.forgetful",
  description: "declares a region and never places it",
  props: z.object({}),
  slots: ["aside"],
  component: ({ loom, children }: LoomPrimitiveProps) => createElement("div", { ...loom.editable }, children),
})

const leaf = definePrimitive({
  type: "loom.leaf",
  description: "holds its copy in props, so a child node has nowhere to go",
  props: z.object({}),
  component: ({ loom }: LoomPrimitiveProps) => createElement("span", { ...loom.editable }, "fixed"),
})

/**
 * The shape 0075 exists for: a primitive that is a container under one prop
 * value and a leaf under another, which the probe used to classify by whichever
 * shape it happened to take with no props at all.
 */
const conditional = definePrimitive({
  type: "loom.conditional",
  description: "places its children only when asked to",
  props: z.object({ kind: z.enum(["plain", "listing"]).optional() }),
  component: ({ loom, props, children }) =>
    createElement("div", { ...loom.editable }, props.kind === "listing" ? children : null),
})

const brittle = definePrimitive({
  type: "loom.brittle",
  description: "throws on a value its own schema accepts",
  props: z.object({ tone: z.enum(["calm", "loud"]).optional() }),
  component: ({ loom, props, children }) => {
    if (props.tone === "loud") throw new Error("no rendering for tone loud")

    return createElement("div", { ...loom.editable }, children)
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

  it("names the primitive that declared a region and dropped it", () => {
    const audit = auditRegistry(registryOf([forgetful]))

    expect(audit.unplacedSlots).toEqual([{ type: "loom.forgetful", slots: ["aside"] }])
  })

  it("finds no dropped regions in a library that places what it declares", () => {
    expect(auditRegistry(registryOf(testDefinitions)).unplacedSlots).toEqual([])
  })

  /** A leaf is a fact about a primitive, not a fault — reported, never counted as a failure. */
  it("separates the leaves from the containers without calling either wrong", () => {
    const audit = auditRegistry(registryOf([leaf, silent]))

    expect(audit.leaves).toEqual(["loom.leaf"])
    expect(audit.notDecorated).toEqual(["loom.silent"])
  })

  it("leaves a primitive it could not call out of both lists", () => {
    const audit = auditRegistry(registryOf([hooked]))

    expect(audit.unplacedSlots).toEqual([])
    expect(audit.leaves).toEqual([])
  })

  it("does not call a primitive a leaf because its default shape places nothing", () => {
    const audit = auditRegistry(registryOf([conditional, leaf]))

    expect(audit.leaves).toEqual(["loom.leaf"])
  })

  it("names a primitive that threw on props built from its own schema", () => {
    const audit = auditRegistry(registryOf([brittle]))

    expect(audit.throwsOnDeclaredProps).toEqual([
      {
        type: "loom.brittle",
        failures: [{ props: { tone: "loud" }, reason: "no rendering for tone loud" }],
      },
    ])
  })

  /** A throw under one shape is a fault of its own; it does not spoil the verdict. */
  it("still judges the primitive that threw, from the shapes that rendered", () => {
    const audit = auditRegistry(registryOf([brittle]))

    expect(audit.notDecorated).toEqual([])
    expect(audit.notProbeable).toEqual([])
    expect(audit.leaves).toEqual([])
  })

  it("has nothing to report for a library that renders under every shape it accepts", () => {
    expect(auditRegistry(registryOf(testDefinitions)).throwsOnDeclaredProps).toEqual([])
  })
})

describe("describeRegistryAudit", () => {
  it("says of each primitive what the probe found", () => {
    const described = describeRegistryAudit(auditRegistry(registryOf([...testDefinitions, silent, hooked])))

    expect(described).toContain("loom.card: spreads loom.editable")
    expect(described).toContain("loom.silent: does not spread loom.editable")
    expect(described).toContain("loom.hooked: could not be probed")
  })

  it("says which region went missing, and which primitives are leaves", () => {
    const described = describeRegistryAudit(auditRegistry(registryOf([forgetful, leaf])))

    expect(described).toContain("declares aside and does not place it")
    expect(described).toContain("loom.leaf: spreads loom.editable; renders no children (a leaf)")
  })

  it("says how many shapes a leaf was asked about, so the claim can be weighed", () => {
    const described = describeRegistryAudit(auditRegistry(registryOf([conditional])))

    expect(described).toContain("renders its children")
    expect(describeRegistryAudit(auditRegistry(registryOf([leaf])))).not.toContain("configurations")
  })

  it("names the props it threw on, which is the whole reproduction", () => {
    const described = describeRegistryAudit(auditRegistry(registryOf([brittle])))

    expect(described).toContain('threw on {"tone":"loud"} (no rendering for tone loud)')
  })
})

describe("decorationFromAudit", () => {
  it("says yes for a primitive the probe watched decorate", () => {
    const decorates = decorationFromAudit(auditRegistry(registryOf(testDefinitions)))

    expect(decorates(primitiveTypeSchema.parse("loom.card"))).toBe(true)
  })

  it("says no for one the probe watched ignore its decoration", () => {
    const decorates = decorationFromAudit(auditRegistry(registryOf([...testDefinitions, silent])))

    expect(decorates(primitiveTypeSchema.parse("loom.silent"))).toBe(false)
  })

  /** "Could not answer" is not "answered no", and the DOM decides in the end. */
  it("gives an unprobeable primitive the benefit of the doubt", () => {
    const decorates = decorationFromAudit(auditRegistry(registryOf([hooked])))

    expect(decorates(primitiveTypeSchema.parse("loom.hooked"))).toBe(true)
  })

  /** An unregistered type renders as nothing, so its subtree is not in the DOM. */
  it("says no for a type that was never registered", () => {
    const decorates = decorationFromAudit(auditRegistry(registryOf(testDefinitions)))

    expect(decorates(primitiveTypeSchema.parse("loom.stranger"))).toBe(false)
  })
})
