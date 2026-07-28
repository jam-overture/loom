import { describe, expect, it } from "vitest"

import { sequentialIdFactory } from "../ids.js"
import { sampleTree } from "../testing/fixtures.js"
import { buildElement, buildText } from "../tree/builders.js"
import { createTree } from "../tree/tree.js"

import { renderTree } from "./render.js"

describe("renderTree", () => {
  it("renders the whole tree as an indented outline with ids first", () => {
    const { tree } = sampleTree()

    expect(renderTree(tree)).toBe(
      [
        "tree t_1 revision 0",
        'n_7 element loom.page title="Home"',
        "  n_2 element loom.header",
        '    n_1 text "Welcome"',
        "  n_5 slot main",
        '    n_4 element loom.card elevation=1 variant="outlined"',
        '      n_3 text "Body copy"',
        "  n_6 element loom.footer",
      ].join("\n")
    )
  })

  it("sorts props by key so the same tree always renders identically", () => {
    const idFactory = sequentialIdFactory()
    const root = buildElement(idFactory, { type: "loom.page", props: { zeta: 1, alpha: 2 } })

    expect(renderTree(createTree(root, idFactory))).toContain("alpha=2 zeta=1")
  })

  it("marks the scoped node so the model can see what it may touch", () => {
    const { tree, ids } = sampleTree()

    expect(renderTree(tree, ids.card)).toContain("n_4 element loom.card elevation=1 variant=\"outlined\"   <- scope")
  })

  it("escapes text so a newline cannot forge an outline row", () => {
    const idFactory = sequentialIdFactory()
    const text = buildText(idFactory, "first\nn_9 element loom.evil")
    const root = buildElement(idFactory, { type: "loom.page", children: [text] })

    expect(renderTree(createTree(root, idFactory))).toBe(
      ["tree t_1 revision 0", "n_2 element loom.page", '  n_1 text "first\\nn_9 element loom.evil"'].join("\n")
    )
  })

  it("reports the revision the outline was taken at", () => {
    const { tree } = sampleTree()

    expect(renderTree({ ...tree, revision: 7 })).toContain("revision 7")
  })
})
