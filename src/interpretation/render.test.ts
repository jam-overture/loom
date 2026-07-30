import { describe, expect, it } from "vitest"

import { deltaIdSchema, nodeIdSchema, sequentialIdFactory, treeIdSchema } from "../ids.js"
import { primitiveTypeSchema } from "../primitive-type.js"
import { catalogueOf } from "../sdk/catalogue.js"
import { testRegistry } from "../testing/definitions.js"
import { sampleTree } from "../testing/fixtures.js"
import { buildElement, buildText } from "../tree/builders.js"
import type { TreeDelta, TreeOperation } from "../tree/delta.js"
import { createTree } from "../tree/tree.js"

import { renderCatalogue, renderDelta, renderTree } from "./render.js"

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

describe("renderDelta", () => {
  const deltaOf = (operations: readonly TreeOperation[]): TreeDelta => ({
    deltaId: deltaIdSchema.parse("d_1"),
    treeId: treeIdSchema.parse("t_1"),
    baseRevision: 0,
    operations,
  })

  it("numbers operations in the order they apply", () => {
    const rendered = renderDelta(
      deltaOf([
        { op: "remove", nodeId: nodeIdSchema.parse("n_4") },
        {
          op: "move",
          nodeId: nodeIdSchema.parse("n_2"),
          parentId: nodeIdSchema.parse("n_5"),
          index: 1,
        },
      ])
    )

    expect(rendered).toBe(
      ["1. remove n_4 and its subtree", "2. move n_2 into n_5 at 1"].join("\n")
    )
  })

  it("shows the subtree an insert would introduce", () => {
    const idFactory = sequentialIdFactory("r")
    const note = buildElement(idFactory, {
      type: "loom.note",
      props: { tone: "quiet" },
      children: [buildText(idFactory, "Thanks")],
    })

    const rendered = renderDelta(
      deltaOf([{ op: "insert", parentId: nodeIdSchema.parse("n_6"), index: 0, node: note }])
    )

    expect(rendered).toBe(
      [
        "1. insert into n_6 at 0:",
        '    n_r2 element loom.note tone="quiet"',
        '      n_r1 text "Thanks"',
      ].join("\n")
    )
  })

  it("names the prop keys a configure touches, sorted, without their values", () => {
    const rendered = renderDelta(
      deltaOf([
        {
          op: "configure",
          nodeId: nodeIdSchema.parse("n_4"),
          set: { variant: "filled", elevation: 0 },
          unset: ["padding"],
        },
      ])
    )

    expect(rendered).toBe("1. configure n_4 set elevation, variant unset padding")
  })

  it("omits an empty set or unset rather than printing an empty list", () => {
    const rendered = renderDelta(
      deltaOf([{ op: "configure", nodeId: nodeIdSchema.parse("n_4"), set: {}, unset: ["variant"] }])
    )

    expect(rendered).toBe("1. configure n_4 unset variant")
  })
})

describe("renderCatalogue", () => {
  const catalogue = catalogueOf(testRegistry())

  it("gives one line per primitive, with its description", () => {
    const rendered = renderCatalogue(catalogue)

    expect(rendered.split("\n")).toHaveLength(catalogue.length)
    expect(rendered).toContain("- loom.card — A bounded block of related content.")
  })

  it("marks an optional prop with a trailing question mark", () => {
    expect(renderCatalogue(catalogue)).toContain("props: subtitle?, title")
  })

  it("names the slots a primitive projects, and says nothing when it has none", () => {
    const rendered = renderCatalogue(catalogue).split("\n")

    expect(rendered[0]).toContain("slots: main")
    expect(rendered[2]).not.toContain("slots")
  })

  it("says a primitive declares no props, rather than leaving it unsaid", () => {
    expect(renderCatalogue(catalogue)).toContain("- loom.header — The banner at the top of a page. props: none")
  })

  it("distinguishes props it cannot enumerate from props that do not exist", () => {
    const rendered = renderCatalogue([
      {
        type: primitiveTypeSchema.parse("loom.either"),
        description: "one shape or another",
        props: undefined,
        slots: [],
      },
    ])

    expect(rendered).toContain("props: not declared")
  })
})
