import { describe, expect, it } from "vitest"

import { buildElement, buildText, createTree, sequentialIdFactory } from "@loom/runtime"
import type { DecorationLookup } from "@loom/runtime/react"

import { portalDecoration } from "./addressing"
import { outlineRows } from "./outline"
import { seedTree } from "./seed"

const everything: DecorationLookup = () => true

const treeWith = (text: string) => {
  const ids = sequentialIdFactory("o")

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      children: [buildElement(ids, { type: "loom.heading", children: [buildText(ids, text)] })],
    }),
    ids
  )
}

describe("outlineRows", () => {
  it("gives one row per node, in reading order, with its depth", () => {
    const rows = outlineRows(treeWith("Title"), everything)

    expect(rows.map((row) => [row.label, row.depth])).toEqual([
      ["loom.page", 0],
      ["loom.heading", 1],
      ["Title", 2],
    ])
  })

  it("labels a text node with its own text, collapsed and cut to fit", () => {
    const rows = outlineRows(treeWith(`  A  sentence\nlong enough ${"x".repeat(60)}`), everything)

    const text = rows.at(-1)

    expect(text?.label.startsWith("A sentence long enough")).toBe(true)
    expect(text?.label.endsWith("…")).toBe(true)
    expect(text?.label.length).toBeLessThanOrEqual(43)
  })

  /** A text node renders as a bare string, so the row has to point elsewhere. */
  it("delegates a text row to the element that contains it", () => {
    const rows = outlineRows(treeWith("Title"), everything)

    const heading = rows[1]
    const text = rows[2]

    expect(text?.addressing).toEqual({
      outcome: "delegated",
      nodeId: heading?.nodeId,
      requested: text?.nodeId,
      reason: "not-an-element",
    })
  })

  it("delegates past a primitive that does not decorate, rather than hiding the row", () => {
    const rows = outlineRows(treeWith("Title"), (type) => type !== "loom.heading")

    const page = rows[0]
    const heading = rows[1]

    expect(heading?.addressing).toEqual({
      outcome: "delegated",
      nodeId: page?.nodeId,
      requested: heading?.nodeId,
      reason: "undecorated-primitive",
    })
  })
})

describe("the portal's own tree", () => {
  /**
   * The read path's promise: every element the seed uses is clickable in the
   * preview. 0012 means registration would have succeeded without that, so this
   * is what makes it true rather than intended.
   */
  it("addresses every element in the seed directly, and delegates only text", () => {
    const rows = outlineRows(seedTree(), portalDecoration)

    for (const row of rows) {
      expect(row.addressing.outcome).toBe(row.kind === "element" ? "addressable" : "delegated")
    }
  })
})
