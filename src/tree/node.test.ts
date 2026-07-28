import { describe, expect, it } from "vitest"

import { sequentialIdFactory } from "../ids.js"
import { primitiveTypeSchema, slotNameSchema } from "../primitive-type.js"
import { sampleTree } from "../testing/fixtures.js"

import { buildElement, buildSlot, buildText } from "./builders.js"
import { childrenOf, elementNodeSchema, isContainerNode, loomNodeSchema, withChildren } from "./node.js"

describe("primitive type identifiers", () => {
  it("accepts kebab-case segments with optional dot namespacing", () => {
    expect(primitiveTypeSchema.safeParse("stack").success).toBe(true)
    expect(primitiveTypeSchema.safeParse("product-card").success).toBe(true)
    expect(primitiveTypeSchema.safeParse("commerce.product-card").success).toBe(true)
  })

  it("rejects uppercase, leading digits, and empty segments", () => {
    expect(primitiveTypeSchema.safeParse("ProductCard").success).toBe(false)
    expect(primitiveTypeSchema.safeParse("1card").success).toBe(false)
    expect(primitiveTypeSchema.safeParse("commerce..card").success).toBe(false)
    expect(primitiveTypeSchema.safeParse("commerce.").success).toBe(false)
  })

  it("requires camelCase slot names", () => {
    expect(slotNameSchema.safeParse("main").success).toBe(true)
    expect(slotNameSchema.safeParse("primaryAction").success).toBe(true)
    expect(slotNameSchema.safeParse("primary-action").success).toBe(false)
  })
})

describe("node schema", () => {
  it("parses a nested tree of all three kinds", () => {
    const { tree } = sampleTree()
    expect(loomNodeSchema.safeParse(tree.root).success).toBe(true)
  })

  it("rejects an element whose props are not JSON", () => {
    const idFactory = sequentialIdFactory()
    const element = buildElement(idFactory, { type: "loom.card" })

    expect(elementNodeSchema.safeParse({ ...element, props: { onClick: () => null } }).success).toBe(
      false
    )
  })

  it("rejects an unknown node kind", () => {
    expect(loomNodeSchema.safeParse({ kind: "fragment", id: "n_1", children: [] }).success).toBe(
      false
    )
  })

  it("rejects children on a text node", () => {
    const idFactory = sequentialIdFactory()
    const text = buildText(idFactory, "hello")

    const parsed = loomNodeSchema.safeParse({ ...text, children: [] })
    expect(parsed.success).toBe(true)
    expect(parsed.success && "children" in parsed.data).toBe(false)
  })
})

describe("container helpers", () => {
  it("treats elements and slots as containers and text as a leaf", () => {
    const idFactory = sequentialIdFactory()
    const text = buildText(idFactory, "hello")
    const slot = buildSlot(idFactory, "main")
    const element = buildElement(idFactory, { type: "loom.page" })

    expect(isContainerNode(text)).toBe(false)
    expect(isContainerNode(slot)).toBe(true)
    expect(isContainerNode(element)).toBe(true)
    expect(childrenOf(text)).toEqual([])
  })

  it("replaces children without mutating the original node", () => {
    const idFactory = sequentialIdFactory()
    const child = buildText(idFactory, "hello")
    const element = buildElement(idFactory, { type: "loom.page" })

    const next = withChildren(element, [child])
    expect(next.children).toHaveLength(1)
    expect(element.children).toHaveLength(0)
    expect(next.id).toBe(element.id)
  })
})
