import { describe, expect, it } from "vitest"

import { sequentialIdFactory } from "../ids.js"
import { sampleTree } from "../testing/fixtures.js"

import { buildElement, buildText } from "./builders.js"
import { namedNodeIds } from "./naming.js"

const spare = sequentialIdFactory("name")

describe("namedNodeIds", () => {
  it("names an insert's parent and every node it carries", () => {
    const { ids } = sampleTree()
    const caption = buildText(spare, "Sale")
    const banner = buildElement(spare, { type: "loom.banner", children: [caption] })

    expect(namedNodeIds([{ op: "insert", parentId: ids.page, index: 1, node: banner }])).toEqual([
      ids.page,
      banner.id,
      caption.id,
    ])
  })

  /**
   * The subtree a removal destroys is not in the operation, so it is not named.
   * Under-reporting here is safe: an operation that depends on a node something
   * else removed fails in `applyDelta` rather than passing quietly.
   */
  it("names only the node a removal targets, not the subtree it takes with it", () => {
    const { ids } = sampleTree()

    expect(namedNodeIds([{ op: "remove", nodeId: ids.card }])).toEqual([ids.card])
  })

  it("names both ends of a move", () => {
    const { ids } = sampleTree()

    expect(
      namedNodeIds([{ op: "move", nodeId: ids.card, parentId: ids.footer, index: 0 }])
    ).toEqual([ids.card, ids.footer])
  })

  it("names the node a configure targets", () => {
    const { ids } = sampleTree()

    expect(
      namedNodeIds([{ op: "configure", nodeId: ids.body, set: { value: "x" }, unset: [] }])
    ).toEqual([ids.body])
  })

  it("names each node once however many operations reach it", () => {
    const { ids } = sampleTree()

    expect(
      namedNodeIds([
        { op: "configure", nodeId: ids.card, set: { variant: "filled" }, unset: [] },
        { op: "move", nodeId: ids.card, parentId: ids.footer, index: 0 },
        { op: "remove", nodeId: ids.card },
      ])
    ).toEqual([ids.card, ids.footer])
  })

  it("names nothing for no operations", () => {
    expect(namedNodeIds([])).toEqual([])
  })
})
