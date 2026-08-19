import { describe, expect, it } from "vitest"

import {
  buildElement,
  buildText,
  createTree,
  deltaIdSchema,
  nodeIdSchema,
  primitiveTypeSchema,
  sequentialIdFactory,
  type LoomTree,
  type TreeDelta,
  type TreeOperation,
} from "@loom/runtime"

import { describeProposalEffect, formatValue } from "./proposal-effect"

/**
 * One page, three bands, with a heading whose words are worth recognising. Ids
 * are sequential so a test can name a node without holding the tree open.
 */
const pageTree = (): LoomTree => {
  const ids = sequentialIdFactory("p")

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      props: { theme: "quiet" },
      children: [
        buildElement(ids, {
          type: "loom.heading",
          props: { level: 1, tone: "loud" },
          children: [buildText(ids, "Ship faster")],
        }),
        buildElement(ids, {
          type: "loom.card",
          props: {},
          children: [buildText(ids, "Talk to us")],
        }),
        buildElement(ids, { type: "loom.card", props: {}, children: [] }),
      ],
    }),
    ids
  )
}

/** The ids `sequentialIdFactory` mints, in the order the builders run: a child before its parent. */
const HEADING_TEXT = nodeIdSchema.parse("n_p1")
const HEADING = nodeIdSchema.parse("n_p2")
const FIRST_CARD = nodeIdSchema.parse("n_p4")
const SECOND_CARD = nodeIdSchema.parse("n_p5")
const PAGE = nodeIdSchema.parse("n_p6")

const deltaOf = (tree: LoomTree, operations: readonly TreeOperation[]): TreeDelta => ({
  deltaId: deltaIdSchema.parse("d_1"),
  treeId: tree.treeId,
  baseRevision: tree.revision,
  operations,
})

describe("formatValue", () => {
  it("quotes a string, so an empty one is not mistaken for a cleared key", () => {
    expect(formatValue("")).toBe(`""`)
  })

  it("collapses and cuts a long string rather than filling the pane with it", () => {
    const formatted = formatValue(`a  sentence\nthat runs ${"x".repeat(100)}`)

    expect(formatted.startsWith(`"a sentence that runs`)).toBe(true)
    expect(formatted.endsWith(`…"`)).toBe(true)
  })

  it("renders the scalars as themselves", () => {
    expect([formatValue(3), formatValue(true), formatValue(null)]).toEqual(["3", "true", "null"])
  })
})

describe("describeProposalEffect", () => {
  /**
   * The point of the whole module. `configure p_3: value` is what the delta
   * says; what a reviewer needs is the sentence that is there now.
   */
  it("shows the value a reconfigure would replace, not only the one it writes", () => {
    const tree = pageTree()
    const effect = describeProposalEffect(
      tree,
      deltaOf(tree, [{ op: "configure", nodeId: HEADING_TEXT, set: { value: "Ship safer" }, unset: [] }])
    )

    expect(effect.operations[0]?.changes).toEqual([
      { key: "value", before: `"Ship faster"`, after: `"Ship safer"`, inert: false },
    ])
  })

  it("distinguishes a key that is not set from one being cleared", () => {
    const tree = pageTree()
    const effect = describeProposalEffect(
      tree,
      deltaOf(tree, [
        { op: "configure", nodeId: HEADING, set: { align: "center" }, unset: ["tone"] },
      ])
    )

    expect(effect.operations[0]?.changes).toEqual([
      { key: "align", before: null, after: `"center"`, inert: false },
      { key: "tone", before: `"loud"`, after: null, inert: false },
    ])
  })

  /**
   * A proposal that writes the value already there is not a small change, it is
   * no change — and a reviewer who confirms it learns nothing about the Gate
   * from the result.
   */
  it("names an operation that would write the value already there as inert", () => {
    const tree = pageTree()
    const effect = describeProposalEffect(
      tree,
      deltaOf(tree, [
        { op: "configure", nodeId: HEADING, set: { level: 1 }, unset: ["missing-key"] },
      ])
    )

    expect(effect.operations[0]?.inert).toBe(true)
    expect(effect.operations[0]?.detail).toBe("2 values, 2 already set this way")
    expect(effect.inertCount).toBe(1)
  })

  it("counts a partly inert reconfigure as a change, and says how much of it is one", () => {
    const tree = pageTree()
    const effect = describeProposalEffect(
      tree,
      deltaOf(tree, [{ op: "configure", nodeId: HEADING, set: { level: 1, tone: "quiet" }, unset: [] }])
    )

    expect(effect.operations[0]?.inert).toBe(false)
    expect(effect.operations[0]?.detail).toBe("2 values, 1 already set this way")
    expect(effect.inertCount).toBe(0)
  })

  /** A removal names one id and takes a subtree. The count is the part misjudged. */
  it("says how much a removal takes with it, and what it says", () => {
    const tree = pageTree()
    const effect = describeProposalEffect(tree, deltaOf(tree, [{ op: "remove", nodeId: HEADING }]))

    expect(effect.operations[0]).toMatchObject({
      verb: "delete",
      subject: "loom.heading",
      place: ["loom.page"],
      detail: "and 1 node under it",
      text: ["Ship faster"],
      carries: 2,
    })
  })

  it("says plainly when a removal takes nothing but itself", () => {
    const tree = pageTree()
    const effect = describeProposalEffect(
      tree,
      deltaOf(tree, [{ op: "remove", nodeId: SECOND_CARD }])
    )

    expect(effect.operations[0]?.detail).toBe("a single node, with nothing under it")
  })

  /** "at 1" is a coordinate. "before the card" is somewhere a reader can picture. */
  it("places an insert by its neighbour rather than by its index", () => {
    const tree = pageTree()
    const effect = describeProposalEffect(
      tree,
      deltaOf(tree, [
        {
          op: "insert",
          parentId: PAGE,
          index: 1,
          node: {
            kind: "element",
            id: nodeIdSchema.parse("n_new1"),
            type: primitiveTypeSchema.parse("loom.card"),
            props: {},
            children: [{ kind: "text", id: nodeIdSchema.parse("n_new2"), value: "New band" }],
          },
        },
      ])
    )

    expect(effect.operations[0]).toMatchObject({
      verb: "add",
      subject: "loom.card",
      place: ["loom.page"],
      detail: "into loom.page, before loom.card, bringing 2 nodes",
      text: ["New band"],
      carries: 2,
    })
  })

  it("says an insert past the last child lands at the end", () => {
    const tree = pageTree()
    const effect = describeProposalEffect(
      tree,
      deltaOf(tree, [
        {
          op: "insert",
          parentId: PAGE,
          index: 3,
          node: { kind: "text", id: nodeIdSchema.parse("n_tail1"), value: "Footnote" },
        },
      ])
    )

    expect(effect.operations[0]?.detail).toBe("at the end of loom.page")
  })

  it("says where a move came from as well as where it goes", () => {
    const tree = pageTree()
    const effect = describeProposalEffect(
      tree,
      deltaOf(tree, [{ op: "move", nodeId: HEADING_TEXT, parentId: FIRST_CARD, index: 0 }])
    )

    expect(effect.operations[0]?.detail).toBe(
      "out of loom.heading and into loom.card, at position 0"
    )
  })

  /**
   * `index` is read against the child list the node has already left, so moving
   * a node to its own index puts it back exactly where it was.
   */
  it("names a move that changes nothing as inert", () => {
    const tree = pageTree()
    const effect = describeProposalEffect(
      tree,
      deltaOf(tree, [{ op: "move", nodeId: FIRST_CARD, parentId: PAGE, index: 1 }])
    )

    expect(effect.operations[0]).toMatchObject({
      detail: "within loom.page, position 1 → 1",
      inert: true,
    })
  })

  /**
   * The reviewer needs this *before* they press apply. A hold answered against a
   * tree that has moved is refused by the runtime, and a queue that only says so
   * afterwards has spent the reviewer's decision on nothing.
   */
  it("says the proposal no longer applies, and why, when the node it names is gone", () => {
    const tree = pageTree()
    const effect = describeProposalEffect(
      tree,
      deltaOf(tree, [
        { op: "configure", nodeId: nodeIdSchema.parse("n_p99"), set: { tone: "quiet" }, unset: [] },
      ])
    )

    expect(effect.applies).toBe(false)
    expect(effect.obstacle).toBe("No node n_p99 in this tree.")
    expect(effect.operations[0]).toMatchObject({ missing: true, detail: "this tree has no such node" })
  })

  it("reports a proposal judged against an older revision as stale, in the runtime's words", () => {
    const tree = pageTree()
    const effect = describeProposalEffect(tree, {
      ...deltaOf(tree, [{ op: "remove", nodeId: SECOND_CARD }]),
      baseRevision: tree.revision - 1,
    })

    expect(effect).toMatchObject({
      stale: true,
      applies: false,
      baseRevision: tree.revision - 1,
      treeRevision: tree.revision,
    })
    expect(effect.obstacle).toContain("revision")
  })

  it("holds a proposal that still applies to be applicable and current", () => {
    const tree = pageTree()
    const effect = describeProposalEffect(
      tree,
      deltaOf(tree, [{ op: "configure", nodeId: HEADING, set: { tone: "quiet" }, unset: [] }])
    )

    expect(effect).toMatchObject({ applies: true, obstacle: null, stale: false, inertCount: 0 })
  })

  /**
   * Each operation observes the ones before it (0001), so a description that
   * read every operation against the original tree would misreport the second
   * half of any delta that builds on its own work.
   */
  it("describes each operation against the tree the ones before it left", () => {
    const tree = pageTree()
    const inserted = nodeIdSchema.parse("n_late1")
    const effect = describeProposalEffect(
      tree,
      deltaOf(tree, [
        {
          op: "insert",
          parentId: FIRST_CARD,
          index: 0,
          node: { kind: "element", id: inserted, type: primitiveTypeSchema.parse("loom.heading"), props: { tone: "loud" }, children: [] },
        },
        { op: "configure", nodeId: inserted, set: { tone: "quiet" }, unset: [] },
      ])
    )

    expect(effect.applies).toBe(true)
    expect(effect.operations[1]).toMatchObject({
      subject: "loom.heading",
      place: ["loom.page", "loom.card"],
      missing: false,
      changes: [{ key: "tone", before: `"loud"`, after: `"quiet"`, inert: false }],
    })
  })

  /**
   * The operation that fails is the one the reviewer most needs to see, and the
   * ones after it are what the change was *for*. Stopping the walk at the
   * failure would hide both.
   */
  it("keeps describing after an operation that cannot be applied", () => {
    const tree = pageTree()
    const effect = describeProposalEffect(
      tree,
      deltaOf(tree, [
        { op: "remove", nodeId: nodeIdSchema.parse("n_p99") },
        { op: "configure", nodeId: HEADING, set: { tone: "quiet" }, unset: [] },
      ])
    )

    expect(effect.applies).toBe(false)
    expect(effect.operations).toHaveLength(2)
    expect(effect.operations[1]).toMatchObject({ subject: "loom.heading", missing: false })
  })
})
