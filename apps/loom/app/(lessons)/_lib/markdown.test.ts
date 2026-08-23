import { describe, expect, it } from "vitest"

import { parseBlocks } from "./markdown"

/**
 * The constructs a lesson actually uses, each with the case that would go wrong
 * if it were parsed line by line instead of block by block.
 */

describe("blocks", () => {
  it("joins a soft-wrapped paragraph back into one paragraph", () => {
    const [block] = parseBlocks("The danger is not that the loop\nexists; it is that it could\nbe hidden.")

    expect(block).toEqual({
      kind: "paragraph",
      text: "The danger is not that the loop exists; it is that it could be hidden.",
    })
  })

  it("keeps the newlines inside a fence, where they are the content", () => {
    const [block] = parseBlocks("```ts\nconst a = 1\n\nconst b = 2\n```")

    expect(block).toEqual({ kind: "code", language: "ts", code: "const a = 1\n\nconst b = 2" })
  })

  it("keeps a list item's continuation lines with the item", () => {
    const [block] = parseBlocks(
      "1. Why is text a node rather than a prop?\n   Say the consequence.\n2. Name both."
    )

    expect(block).toEqual({
      kind: "list",
      ordered: true,
      items: ["Why is text a node rather than a prop? Say the consequence.", "Name both."],
    })
  })

  it("does not end a list at the blank line between two paragraphs of one item", () => {
    const [block] = parseBlocks("1. First half.\n\n   Second half.\n2. Next.")

    expect(block).toEqual({
      kind: "list",
      ordered: true,
      items: ["First half. Second half.", "Next."],
    })
  })

  it("does not end a list at the blank line between two items", () => {
    const [block] = parseBlocks("1. How many attempts?\n\n2. What would you hand it?\n\n3. What number would you report?")

    expect(block?.kind === "list" ? block.items : []).toHaveLength(3)
  })

  it("ends a list at a blank line followed by prose", () => {
    expect(parseBlocks("1. One.\n2. Two.\n\nQuestion 2 is the scaffolding.").map((each) => each.kind)).toEqual([
      "list",
      "paragraph",
    ])
  })

  it("parses a blockquote as blocks, so Predict's questions survive it", () => {
    const [block] = parseBlocks("> React has three node kinds.\n>\n> 1. List the ones you would add.\n> 2. Say what each costs.")

    expect(block?.kind).toBe("quote")
    expect(block?.kind === "quote" ? block.blocks.map((each) => each.kind) : []).toEqual([
      "paragraph",
      "list",
    ])
  })

  it("reads a pipe table as headers and rows, and is not fooled by the rule row", () => {
    const [block] = parseBlocks(
      "| Where | What it means |\n| --- | --- |\n| `rejected` | The Gate will not allow this |"
    )

    expect(block).toEqual({
      kind: "table",
      headers: ["Where", "What it means"],
      rows: [["`rejected`", "The Gate will not allow this"]],
    })
  })

  it("tells a horizontal rule from a table's rule row", () => {
    expect(parseBlocks("---").map((each) => each.kind)).toEqual(["rule"])
    expect(parseBlocks("| a |\n| --- |\n| b |").map((each) => each.kind)).toEqual(["table"])
  })

  it("gives a heading its level", () => {
    expect(parseBlocks("### Whose capability is it, anyway?")).toEqual([
      { kind: "heading", level: 3, text: "Whose capability is it, anyway?" },
    ])
  })
})
