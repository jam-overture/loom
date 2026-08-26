import { describe, expect, it } from "vitest"

import { deltaIdSchema, nodeIdSchema, sequentialIdFactory, treeIdSchema } from "../ids.js"
import { primitiveTypeSchema } from "../primitive-type.js"
import { createStarterPrimitiveRegistry } from "../primitives/index.js"
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

  it("sends the spine and the scope, and collapses everything else to a count", () => {
    const { tree, ids } = sampleTree()

    expect(renderTree(tree, ids.card)).toBe(
      [
        "tree t_1 revision 0",
        'n_7 element loom.page title="Home"',
        "  … 1 preceding child omitted",
        "  n_5 slot main",
        '    n_4 element loom.card elevation=1 variant="outlined"   <- scope',
        '      n_3 text "Body copy"',
        "  … 1 following child omitted",
      ].join("\n")
    )
  })

  /**
   * The preceding count is the scope node's index among its siblings, which is
   * what an insert beside it would have to name. One combined total would take
   * that away, which is why there are two counts rather than one.
   */
  it("counts the omitted siblings on each side separately", () => {
    const idFactory = sequentialIdFactory()
    const kids = ["a", "b", "c", "d", "e"].map((value) => buildText(idFactory, value))
    const root = buildElement(idFactory, { type: "loom.page", children: kids })
    const rendered = renderTree(createTree(root, idFactory), kids[2]?.id)

    expect(rendered).toContain("  … 2 preceding children omitted")
    expect(rendered).toContain("  … 2 following children omitted")
    expect(rendered).toContain('  n_3 text "c"   <- scope')
    expect(rendered).not.toContain('text "a"')
    expect(rendered).not.toContain('text "e"')
  })

  it("says nothing about a side that has no siblings to omit", () => {
    const idFactory = sequentialIdFactory()
    const only = buildText(idFactory, "alone")
    const root = buildElement(idFactory, { type: "loom.page", children: [only] })

    expect(renderTree(createTree(root, idFactory), only.id)).not.toContain("omitted")
  })

  /**
   * The property the whole change exists for. An outline of the full page is
   * linear in its node count and is re-sent on every proposal and again on every
   * repair; a scoped one is the size of what it is allowed to touch, whatever it
   * is sitting on.
   */
  it("does not grow with the page the scope sits on", () => {
    const pageOf = (sections: number) => {
      const idFactory = sequentialIdFactory()
      const children = Array.from({ length: sections }, (_, index) =>
        buildElement(idFactory, {
          type: "loom.section",
          props: { title: `Section ${index}` },
          children: [buildText(idFactory, `Body copy for section number ${index}.`)],
        })
      )
      const root = buildElement(idFactory, { type: "loom.page", children })

      return { tree: createTree(root, idFactory), target: children[0] }
    }

    const small = pageOf(5)
    const large = pageOf(500)

    const scopedSmall = renderTree(small.tree, small.target?.id).length
    const scopedLarge = renderTree(large.tree, large.target?.id).length

    expect(renderTree(large.tree).length).toBeGreaterThan(renderTree(small.tree).length * 50)
    expect(scopedLarge - scopedSmall).toBeLessThan(20)
  })

  it("renders the whole tree when the scope names a node it does not contain", () => {
    const { tree } = sampleTree()
    const absent = nodeIdSchema.parse("n_404")

    expect(renderTree(tree, absent)).toBe(renderTree(tree))
  })

  it("renders the whole tree when the scope is the root, because that is what it means", () => {
    const { tree, ids } = sampleTree()

    expect(renderTree(tree, ids.page)).toContain('n_6 element loom.footer')
    expect(renderTree(tree, ids.page)).not.toContain("omitted")
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

  it("does not end a line in two full stops when its author wrote one", () => {
    const rendered = renderCatalogue([
      {
        type: primitiveTypeSchema.parse("loom.written"),
        description: "The root of a page. Stacks its children in one column.",
        props: [],
        slots: [],
      },
    ])

    expect(rendered).toBe(
      "- loom.written — The root of a page. Stacks its children in one column. props: none"
    )
  })

  it("leaves a description that ends in a question or an exclamation alone", () => {
    const rendered = renderCatalogue([
      {
        type: primitiveTypeSchema.parse("loom.asking"),
        description: "Have you tried the other one?",
        props: [],
        slots: [],
      },
    ])

    expect(rendered).toContain("the other one? props: none")
  })

  it("finishes the sentence for a description written without one", () => {
    const rendered = renderCatalogue([
      {
        type: primitiveTypeSchema.parse("loom.terse"),
        description: "A banner",
        props: [],
        slots: [],
      },
    ])

    expect(rendered).toContain("- loom.terse — A banner. props: none")
  })

  /**
   * The regression, against the library the defect was found in rather than
   * against a fixture that could be written either way.
   */
  it("renders no line of the starter library with doubled punctuation", () => {
    const registry = createStarterPrimitiveRegistry()
    if (!registry.ok) throw new Error("the starter library failed to register")

    for (const line of renderCatalogue(catalogueOf(registry.value)).split("\n")) {
      expect(line).not.toMatch(/[.!?][.!?]/)
    }
  })
})
