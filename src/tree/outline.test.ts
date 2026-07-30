import { describe, expect, it } from "vitest"

import { sequentialIdFactory } from "../ids.js"

import { buildElement, buildSlot, buildText } from "./builders.js"
import { outlineTree } from "./outline.js"

const sample = () => {
  const ids = sequentialIdFactory()

  return buildElement(ids, {
    type: "loom.page",
    children: [
      buildElement(ids, { type: "loom.heading", children: [buildText(ids, "Title")] }),
      buildElement(ids, {
        type: "loom.card",
        children: [buildSlot(ids, "body", [buildText(ids, "Inside")])],
      }),
    ],
  })
}

describe("outlineTree", () => {
  it("flattens in pre-order, so a row always follows the row it nests inside", () => {
    const outline = outlineTree(sample())

    expect(outline.map((entry) => entry.node.kind)).toEqual([
      "element",
      "element",
      "text",
      "element",
      "slot",
      "text",
    ])
  })

  it("records how deep each node sits", () => {
    const outline = outlineTree(sample())

    expect(outline.map((entry) => entry.depth)).toEqual([0, 1, 2, 1, 2, 3])
  })

  it("names the parent of every node but the root", () => {
    const root = sample()
    const outline = outlineTree(root)

    expect(outline[0]?.parentId).toBeNull()
    expect(outline[1]?.parentId).toBe(root.id)
    expect(outline[2]?.parentId).toBe(outline[1]?.node.id)
  })

  /** The index is the same number an insert or a move names, not decoration. */
  it("records the position among siblings", () => {
    const outline = outlineTree(sample())

    expect(outline.map((entry) => entry.index)).toEqual([0, 0, 0, 1, 0, 0])
  })

  it("gives a childless root a single row", () => {
    const ids = sequentialIdFactory()
    const outline = outlineTree(buildElement(ids, { type: "loom.page" }))

    expect(outline).toHaveLength(1)
    expect(outline[0]?.depth).toBe(0)
  })
})
