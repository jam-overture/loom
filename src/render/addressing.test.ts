import { describe, expect, it } from "vitest"

import { nodeIdSchema, sequentialIdFactory } from "../ids.js"
import type { PrimitiveType } from "../primitive-type.js"
import { buildElement, buildSlot, buildText } from "../tree/builders.js"

import { addressedNodeId, addressNode, describeAddressing, type DecorationLookup } from "./addressing.js"

const everything: DecorationLookup = () => true
const nothing: DecorationLookup = () => false
const allBut = (undecorated: string): DecorationLookup => (type: PrimitiveType) => type !== undecorated

const sample = () => {
  const ids = sequentialIdFactory()
  const text = buildText(ids, "Title")
  const heading = buildElement(ids, { type: "loom.heading", children: [text] })
  const slot = buildSlot(ids, "body", [buildText(ids, "Inside")])
  const card = buildElement(ids, { type: "loom.card", children: [slot] })
  const page = buildElement(ids, { type: "loom.page", children: [heading, card] })

  return { page, card, heading, slot, text }
}

describe("addressNode", () => {
  it("answers with the node itself when its primitive decorates", () => {
    const { page, card } = sample()

    expect(addressNode(page, card.id, everything)).toEqual({
      outcome: "addressable",
      nodeId: card.id,
    })
  })

  /**
   * A text node renders as a bare string (0010), so there is nothing in the DOM
   * to click. The nearest element is what a user was pointing at anyway.
   */
  it("delegates a text node to the element that contains it", () => {
    const { page, heading, text } = sample()

    expect(addressNode(page, text.id, everything)).toEqual({
      outcome: "delegated",
      nodeId: heading.id,
      requested: text.id,
      reason: "not-an-element",
    })
  })

  it("delegates a slot to its parent element, since a slot adds no element of its own", () => {
    const { page, card, slot } = sample()

    expect(addressNode(page, slot.id, everything)).toEqual({
      outcome: "delegated",
      nodeId: card.id,
      requested: slot.id,
      reason: "not-an-element",
    })
  })

  /** 0012: registration succeeds for a primitive that ignores `loom.editable`. */
  it("delegates past an undecorated primitive rather than wrapping it", () => {
    const { page, card } = sample()

    expect(addressNode(page, card.id, allBut("loom.card"))).toEqual({
      outcome: "delegated",
      nodeId: page.id,
      requested: card.id,
      reason: "undecorated-primitive",
    })
  })

  it("skips a whole run of undecorated ancestors to reach a decorated one", () => {
    const { page, slot } = sample()

    expect(addressNode(page, slot.id, allBut("loom.card"))).toEqual({
      outcome: "delegated",
      nodeId: page.id,
      requested: slot.id,
      reason: "not-an-element",
    })
  })

  it("gives up when nothing on the path to the root is addressable", () => {
    const { page, card } = sample()

    expect(addressNode(page, card.id, nothing)).toEqual({
      outcome: "unaddressable",
      requested: card.id,
      reason: "undecorated-primitive",
    })
  })

  it("reports a node that is not in the tree as absent rather than guessing", () => {
    const { page } = sample()
    const stranger = nodeIdSchema.parse("n_stranger")

    expect(addressNode(page, stranger, everything)).toEqual({
      outcome: "unaddressable",
      requested: stranger,
      reason: "absent",
    })
  })

  it("keeps the reason the requested node failed, not the ancestor's", () => {
    const { page, text } = sample()

    const addressing = addressNode(page, text.id, allBut("loom.heading"))

    expect(addressing).toEqual({
      outcome: "delegated",
      nodeId: page.id,
      requested: text.id,
      reason: "not-an-element",
    })
  })
})

describe("addressedNodeId", () => {
  it("hands back the id to look for in the DOM, and null when there is none", () => {
    const { page, card, text, heading } = sample()

    expect(addressedNodeId(addressNode(page, card.id, everything))).toBe(card.id)
    expect(addressedNodeId(addressNode(page, text.id, everything))).toBe(heading.id)
    expect(addressedNodeId(addressNode(page, card.id, nothing))).toBeNull()
  })
})

describe("describeAddressing", () => {
  it("says where selection landed and why it moved", () => {
    const { page, card, text } = sample()

    expect(describeAddressing(addressNode(page, card.id, everything))).toBe("addressable")
    expect(describeAddressing(addressNode(page, text.id, everything))).toContain(
      "renders without an element of its own"
    )
    expect(describeAddressing(addressNode(page, card.id, nothing))).toContain(
      "no ancestor is addressable either"
    )
  })
})
