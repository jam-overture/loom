import { describe, expect, it } from "vitest"

import { buildElement, sequentialIdFactory, type NodeId, type TreeDelta } from "@jam-overture/loom"

import { settingsOf } from "./plain-change"
import { demoRegistry } from "./registry"
import { keepingWords, touchedBy, type TouchedNode } from "./touched"

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

/**
 * The words a gap is missing, which is the half a position cannot supply.
 *
 * `parentId` and `index` give a mark somewhere to be drawn. A gap is empty, so
 * the mark drawn in it had nothing to name and said "something". These are the
 * assertions that the subtree the operation is already carrying gets read.
 */
describe("what a delta takes off the page, or brings to it", () => {
  const settings = settingsOf(demoRegistry)

  const stat = (value: string, label: string) =>
    buildElement(ids, { type: "loom.stat", props: { value, label } })

  it("quotes a removed node's own words, read off the insert that would restore it", () => {
    const gone = buildElement(ids, {
      type: "loom.stat-grid",
      props: {},
      children: [stat("3,400", "appointments last year"), stat("24", "years on the same street")],
    })

    const touched = touchedBy(
      delta([{ op: "remove", nodeId: gone.id }]),
      delta([{ op: "insert", parentId: id("root"), index: 4, node: gone }]),
      settings
    )

    expect(touched[0]?.words).toEqual({ words: ["3,400", "24"], more: 0 })
  })

  it("quotes an added node's words from the operation that adds it", () => {
    const arriving = buildElement(ids, {
      type: "loom.stat-grid",
      props: {},
      children: [stat("92%", "seen within a week")],
    })

    const touched = touchedBy(
      delta([{ op: "insert", parentId: id("root"), index: 2, node: arriving }]),
      undefined,
      settings
    )

    expect(touched[0]?.words).toEqual({ words: ["92%"], more: 0 })
  })

  /**
   * The rule rather than an omission. A moved or configured node is still on the
   * page, its mark is a ring drawn round it, and every word it has is inside
   * that ring — so quoting it would read a band back to somebody looking at it.
   */
  it("says nothing about a node that is still on the page", () => {
    const touched = touchedBy(
      delta([
        { op: "move", nodeId: id("n_1"), parentId: id("root"), index: 1 },
        { op: "configure", nodeId: id("n_2"), set: { tone: "accent" }, unset: [] },
      ]),
      undefined,
      settings
    )

    expect(touched.map((one) => one.words)).toEqual([undefined, undefined])
  })

  /** A caller with no registry gets exactly the object it got before this field. */
  it("carries no words when nobody said which strings are words", () => {
    const gone = buildElement(ids, { type: "loom.stat", props: { value: "24", label: "years" } })

    const touched = touchedBy(
      delta([{ op: "remove", nodeId: gone.id }]),
      delta([{ op: "insert", parentId: id("root"), index: 1, node: gone }])
    )

    expect(touched).toEqual([{ kind: "removed", nodeId: gone.id, parentId: id("root"), index: 1 }])
  })
})

/**
 * The Gate looks twice and only the first look has a tree.
 *
 * Confirming a hold narrates a second assessment, folded with no tree in hand,
 * which recomputes `touched` correctly and wordlessly — and that fold is the one
 * that produces the applied card, which is the moment the mark is the whole
 * product. Without this the words existed only on folds nobody was looking at.
 */
describe("the words an earlier assessment of the same change already had", () => {
  const had = (words: readonly string[]): TouchedNode => ({
    kind: "removed",
    nodeId: id("n_1"),
    parentId: id("root"),
    index: 4,
    words: { words: [...words], more: 0 },
  })

  it("fills in a fresh reading that has none", () => {
    const fresh: TouchedNode[] = [{ kind: "removed", nodeId: id("n_1"), parentId: id("root"), index: 4 }]

    expect(keepingWords(fresh, [had(["3,400"])])[0]?.words).toEqual({ words: ["3,400"], more: 0 })
  })

  it("never overwrites words the fresh reading computed itself", () => {
    const fresh: TouchedNode[] = [
      { kind: "removed", nodeId: id("n_1"), words: { words: ["now"], more: 0 } },
    ]

    expect(keepingWords(fresh, [had(["then"])])[0]?.words).toEqual({ words: ["now"], more: 0 })
  })

  it("will not carry words across a different node, or a different kind", () => {
    const other: TouchedNode[] = [{ kind: "removed", nodeId: id("n_2") }]
    const added: TouchedNode[] = [{ kind: "added", nodeId: id("n_1"), parentId: id("root"), index: 4 }]

    expect(keepingWords(other, [had(["3,400"])])[0]?.words).toBeUndefined()
    expect(keepingWords(added, [had(["3,400"])])[0]?.words).toBeUndefined()
  })

  it("is the identity when there is no earlier reading", () => {
    const fresh: TouchedNode[] = [{ kind: "removed", nodeId: id("n_1") }]

    expect(keepingWords(fresh, undefined)).toEqual(fresh)
  })
})
