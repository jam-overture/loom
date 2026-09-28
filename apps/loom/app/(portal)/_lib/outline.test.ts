import { describe, expect, it } from "vitest"

import { buildElement, buildSlot, buildText, createTree, sequentialIdFactory } from "@jam-overture/loom"
import type { DecorationLookup } from "@jam-overture/loom/react"

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
      ["Page", 0],
      ["Heading", 1],
      ["Title", 2],
    ])
  })

  /**
   * Dropped until phase 2 needed it. The smallest part of a page that holds
   * everything a reader picked is worked out from these, and a view model that
   * forgot which part a part sits in left `_lib/selection-scope.ts` inferring
   * nesting from a run of depths — the same answer derived from a weaker fact.
   */
  it("says which part each row sits inside, and nothing for the page itself", () => {
    const rows = outlineRows(treeWith("Title"), everything)

    expect(rows.map((row) => row.parentId)).toEqual([
      null,
      rows[0]?.nodeId,
      rows[1]?.nodeId,
    ])
  })

  /**
   * The rail printed `loom.page` over `loom.heading` over the words, which is
   * the registry describing itself to somebody who has a page with a heading on
   * it. A row is a place, and a place is named by what it is.
   */
  it("names a part by what it is, not by the type that draws it", () => {
    const rows = outlineRows(treeWith("Title"), everything)

    for (const row of rows) expect(row.label).not.toContain("loom.")
  })

  /**
   * The half that keeps this a disclosure rather than a deletion: the type is
   * still on the row, for the pane that prints it one click down.
   */
  it("keeps the registered type on the row rather than dropping it", () => {
    const rows = outlineRows(treeWith("Title"), everything)

    expect(rows.map((row) => row.technical)).toEqual(["loom.page", "loom.heading", null])
  })

  /**
   * A name nobody has to write down. `part-name.ts` owns the rule and this is
   * the case that proves the rail is using it rather than a table of the four
   * primitives this deployment happens to register.
   */
  it("reads a host's own namespaced, hyphenated type as words", () => {
    const ids = sequentialIdFactory("o")
    const tree = createTree(buildElement(ids, { type: "acme.buy-button" }), ids)

    expect(outlineRows(tree, everything)[0]?.label).toBe("Buy button")
  })

  it("calls a slot by its own name and says what a slot is", () => {
    const ids = sequentialIdFactory("o")
    const tree = createTree(
      buildElement(ids, {
        type: "loom.card",
        children: [buildSlot(ids, "body", [buildText(ids, "Inside")])],
      }),
      ids
    )

    const slot = outlineRows(tree, everything)[1]

    expect(slot?.label).toBe("Body space")
    expect(slot?.technical).toBe("body")
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
