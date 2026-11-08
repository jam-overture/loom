import { describe, expect, it } from "vitest"

import {
  applyDelta,
  buildElement,
  buildText,
  createTree,
  sequentialIdFactory,
  type LoomNode,
  type LoomTree,
  type NodeId,
  type TreeOperation,
} from "@jam-overture/loom"

import { compareTrees, foldedOutlineOf, type Mark, type OutlineRow } from "./compare"

const ids = sequentialIdFactory("cmp")

/** A page: a stack holding a heading, a card with a button in it, and a note. */
const PAGE: LoomTree = createTree(
  buildElement(ids, {
    type: "loom.stack",
    children: [
      buildElement(ids, { type: "loom.heading", children: [buildText(ids, "Welcome")] }),
      buildElement(ids, {
        type: "loom.card",
        children: [buildElement(ids, { type: "loom.button", children: [buildText(ids, "Buy")] })],
      }),
      buildElement(ids, { type: "loom.text", children: [buildText(ids, "Small print")] }),
    ],
  }),
  ids
)

const findType = (nodes: readonly LoomNode[], type: string): NodeId | undefined =>
  nodes.reduce<NodeId | undefined>(
    (found, node) =>
      found ??
      (node.kind === "text"
        ? undefined
        : node.kind === "element" && node.type === type
          ? node.id
          : findType(node.children, type)),
    undefined
  )

const idOf = (type: string): NodeId => {
  const found = findType([PAGE.root], type)

  if (found === undefined) throw new Error(`the page has a ${type}`)

  return found
}

const STACK = PAGE.root.id
const HEADING = idOf("loom.heading")
const CARD = idOf("loom.card")
const BUTTON = idOf("loom.button")
const NOTE = idOf("loom.text")

const changed = (...operations: readonly TreeOperation[]): LoomTree => {
  const applied = applyDelta(PAGE, {
    deltaId: ids.deltaId(),
    treeId: PAGE.treeId,
    baseRevision: PAGE.revision,
    operations,
  })

  if (!applied.ok) throw new Error(`expected the change to apply: ${applied.error.code}`)

  return applied.value
}

const marks = (rows: readonly { nodeId: string; mark: Mark | undefined }[]) =>
  Object.fromEntries(
    rows.flatMap((row) => (row.mark === undefined ? [] : [[row.nodeId, row.mark]]))
  )

describe("compareTrees", () => {
  it("draws both sides as the page's outline, nested as the page nests its parts", () => {
    const { before, after } = compareTrees(PAGE, PAGE)

    expect(after.map((row) => [row.nodeId, row.depth])).toEqual([
      [HEADING, 0],
      [CARD, 0],
      [BUTTON, 1],
      [NOTE, 0],
    ])
    expect(before).toEqual(after)
  })

  it("marks nothing, and says so, where no part changed", () => {
    const comparison = compareTrees(PAGE, PAGE)

    expect(marks(comparison.before)).toEqual({})
    expect(marks(comparison.after)).toEqual({})
    expect(comparison.summary).toBe("Nothing a reader can see changed.")
  })

  it("marks a part taken off on Before alone, with what was inside it", () => {
    const comparison = compareTrees(PAGE, changed({ op: "remove", nodeId: CARD }))

    expect(marks(comparison.before)).toEqual({ [CARD]: "removed", [BUTTON]: "removed" })
    expect(marks(comparison.after)).toEqual({})
    expect(comparison.summary).toBe("2 parts taken off.")
  })

  it("marks a part added on After alone", () => {
    const node = buildElement(ids, { type: "loom.text", children: [buildText(ids, "New")] })
    const comparison = compareTrees(
      PAGE,
      changed({ op: "insert", parentId: STACK, index: 0, node })
    )

    expect(marks(comparison.after)).toEqual({ [node.id]: "added" })
    expect(marks(comparison.before)).toEqual({})
    expect(comparison.summary).toBe("1 part added.")
  })

  it("marks the one part moved to the top, not every part it passed", () => {
    const comparison = compareTrees(
      PAGE,
      changed({ op: "move", nodeId: NOTE, parentId: STACK, index: 0 })
    )

    expect(marks(comparison.after)).toEqual({ [NOTE]: "moved" })
    expect(marks(comparison.before)).toEqual({ [NOTE]: "moved" })
    expect(comparison.summary).toBe("1 part moved.")
  })

  it("marks a part moved into another part on both sides", () => {
    const comparison = compareTrees(
      PAGE,
      changed({ op: "move", nodeId: BUTTON, parentId: STACK, index: 3 })
    )

    expect(marks(comparison.after)).toEqual({ [BUTTON]: "moved" })
    expect(comparison.after.find((row) => row.nodeId === BUTTON)?.depth).toBe(0)
    expect(marks(comparison.before)).toEqual({ [BUTTON]: "moved" })
  })

  it("marks a part whose own settings changed on After, and not the part it sits in", () => {
    const comparison = compareTrees(
      PAGE,
      changed({ op: "configure", nodeId: BUTTON, set: { tone: "bold" }, unset: [] })
    )

    expect(marks(comparison.after)).toEqual({ [BUTTON]: "changed" })
    expect(marks(comparison.before)).toEqual({})
    expect(comparison.summary).toBe("1 part changed.")
  })

  it("says every kind of change at once, in one sentence", () => {
    const node = buildElement(ids, { type: "loom.text", children: [buildText(ids, "New")] })
    const comparison = compareTrees(
      PAGE,
      changed(
        { op: "insert", parentId: STACK, index: 0, node },
        { op: "configure", nodeId: HEADING, set: { level: 2 }, unset: [] },
        { op: "remove", nodeId: CARD }
      )
    )

    expect(comparison.summary).toBe("1 part added, 1 part changed, 2 parts taken off.")
  })
})

describe("foldedOutlineOf", () => {
  const row = (nodeId: string, depth: number, mark?: Mark): OutlineRow => ({
    nodeId,
    name: nodeId,
    depth,
    mark,
  })

  it("keeps a marked part, the parts it sits inside and the part either side, and folds the rest", () => {
    const lines = foldedOutlineOf([
      row("a", 0),
      row("b", 0),
      row("c", 0),
      row("d", 0),
      row("card", 0),
      row("x", 1),
      row("y", 1),
      row("button", 2, "added"),
      row("z", 1),
      row("w", 1),
      row("e", 0),
    ])

    expect(
      lines.map((line) =>
        line.kind === "part" ? line.row.nodeId : `${line.count} at ${line.depth}`
      )
    ).toEqual(["4 at 0", "card", "1 at 1", "y", "button", "z", "2 at 0"])
  })

  it("folds a page where nothing changed into one line", () => {
    expect(foldedOutlineOf([row("a", 0), row("b", 1), row("c", 0)])).toEqual([
      { kind: "folded", count: 3, depth: 0, key: "folded-a" },
    ])
  })
})
