import { describe, expect, it } from "vitest"

import { buildElement, sequentialIdFactory, type NodeId, type TreeDelta } from "@loom/runtime"

import { touchedBy } from "./touched"

/**
 * The delta, read for *where* rather than for *what*.
 *
 * Four operations, four answers, and one of them is only answerable because the
 * inverse is beside it: a removed node has left the tree, so the sole surviving
 * record of where it was is the `insert` that would put it back.
 */

const ids = sequentialIdFactory("touch")

/** Node ids are branded, and a fixture is the one place they are written by hand. */
const id = (value: string): NodeId => value as NodeId

const delta = (operations: TreeDelta["operations"]): TreeDelta => ({
  deltaId: ids.deltaId(),
  treeId: "t_1" as TreeDelta["treeId"],
  baseRevision: 0,
  operations,
})

describe("what a delta touches", () => {
  it("names an inserted node, and where it was put", () => {
    const node = buildElement(ids, { type: "loom.divider", props: {} })

    expect(touchedBy(delta([{ op: "insert", parentId: id("root"), index: 2, node }]))).toEqual([
      { kind: "added", nodeId: node.id, parentId: id("root"), index: 2 },
    ])
  })

  /**
   * The one that needs the inverse. Without it a surface knows a node is gone
   * and has nowhere to point; with it, the gap has an address.
   */
  it("finds where a removed node was, from the insert that would restore it", () => {
    const gone = buildElement(ids, { type: "loom.quote", props: { quote: "…", author: "…" } })

    const touched = touchedBy(
      delta([{ op: "remove", nodeId: gone.id }]),
      delta([{ op: "insert", parentId: id("root"), index: 4, node: gone }])
    )

    expect(touched).toEqual([{ kind: "removed", nodeId: gone.id, parentId: id("root"), index: 4 }])
  })

  it("says a removal has no place when nobody computed the inverse", () => {
    expect(touchedBy(delta([{ op: "remove", nodeId: id("n_9") }]))).toEqual([
      { kind: "removed", nodeId: id("n_9") },
    ])
  })

  it("names a moved node and its destination, and a configured node alone", () => {
    const touched = touchedBy(
      delta([
        { op: "move", nodeId: id("n_1"), parentId: id("root"), index: 1 },
        { op: "configure", nodeId: id("n_2"), set: { tone: "accent" }, unset: [] },
      ])
    )

    expect(touched).toEqual([
      { kind: "moved", nodeId: id("n_1"), parentId: id("root"), index: 1 },
      { kind: "changed", nodeId: id("n_2") },
    ])
  })

  it("keeps the operations in the order they were proposed", () => {
    const touched = touchedBy(
      delta([
        { op: "configure", nodeId: id("n_1"), set: {}, unset: ["tone"] },
        { op: "move", nodeId: id("n_2"), parentId: id("root"), index: 0 },
      ])
    )

    expect(touched.map((one) => one.nodeId)).toEqual(["n_1", "n_2"])
  })
})
