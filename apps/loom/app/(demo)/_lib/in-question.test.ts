import { describe, expect, it } from "vitest"

import {
  findNode,
  randomIdFactory,
  type LoomTree,
  type NodeId,
  type TreeDelta,
  type TreeOperation,
} from "@jam-overture/loom"

import { partFromOperations, partInQuestion } from "./in-question"
import { demoPageTree } from "./page-tree"
import { presetById } from "./presets"

/**
 * Which part a held change is about, proved against the page a visitor sees.
 *
 * The operations come from the presets rather than from fixtures, for the
 * reason `spotlight.test.ts` gives about the marks: the interesting failures
 * here are the ones where the delta is right and the preview shows the wrong
 * thing — the whole page instead of a band, or a node that left the tree three
 * revisions ago. A hand-written operation cannot produce either.
 */

const tree = (): LoomTree => demoPageTree()

/** The delta a preset would emit, computed the way the interpreter computes it. */
const deltaFor = (presetId: string, against: LoomTree): TreeDelta => {
  const preset = presetById(presetId)
  if (!preset) throw new Error(`no preset ${presetId}`)

  const operations = preset.plan(against, randomIdFactory)
  if (operations === undefined) throw new Error(`${presetId} has nothing to do to this tree`)

  return {
    deltaId: randomIdFactory.deltaId(),
    treeId: against.treeId,
    baseRevision: against.revision,
    operations,
  }
}

/**
 * The node the demo's leading ask is about, found the way the preset finds it.
 *
 * Read off the tree rather than written down, for the reason the file opens
 * with: an id in a fixture is an id that stops being the band the moment
 * `page-tree.ts` is edited, and every assertion about it goes on passing.
 */
const statsId = (against: LoomTree): NodeId => {
  const operations = deltaFor("trim", against).operations
  const first = operations[0]
  if (first === undefined || first.op !== "remove") throw new Error("trim is not a removal")

  return first.nodeId
}

const wrap = (against: LoomTree, operations: readonly TreeOperation[]): TreeDelta => ({
  deltaId: randomIdFactory.deltaId(),
  treeId: against.treeId,
  baseRevision: against.revision,
  operations,
})

describe("the part a held change is about", () => {
  /**
   * The demo's leading ask, and the one the whole surface is arranged around.
   * The subject of a removal is on the page now, so the preview is read off the
   * tree the visitor is looking at rather than out of the delta.
   */
  it("is the band a removal would take, read off the page as it stands", () => {
    const page = tree()
    const part = partInQuestion(page, deltaFor("trim", page))

    expect(part?.tree.root.type).toBe("loom.stat-grid")
    expect(findNode(page.root, part!.tree.root.id)).not.toBeNull()
    expect(part?.lead).toBe("This is what would come off the page.")
  })

  /**
   * The case a preview exists for more than any other: an insert's subject is
   * not on the page and cannot be pointed at, so rendering what the proposal is
   * carrying is the only way to show it at all.
   */
  it("is the band an insert carries, which the page does not have yet", () => {
    const page = tree()
    const part = partInQuestion(page, deltaFor("band", page))

    expect(part?.tree.root.type).toBe("loom.section")
    expect(findNode(page.root, part!.tree.root.id)).toBeNull()
    expect(part?.lead).toBe("This is what would be added.")
  })

  it("is the band a move would relocate", () => {
    const page = tree()
    const part = partInQuestion(page, deltaFor("promote", page))

    expect(part?.tree.root.type).toBe("loom.quote")
    expect(part?.lead).toBe("This is the part that would move.")
  })

  /**
   * The re-theme is one configure against the root, and an excerpt of the root
   * is the page — rendered a second time, inside a card in the rail beside it.
   * `spotlight.ts` declines to mark the root for the same reason.
   */
  it("is nothing at all when the change is about the whole page", () => {
    const page = tree()

    expect(partInQuestion(page, deltaFor("palette", page))).toBeUndefined()
  })

  it("is nothing when the delta names a node this tree does not have", () => {
    const page = tree()
    const gone = wrap(page, [{ op: "remove", nodeId: "n_not_here" as NodeId }])

    expect(partInQuestion(page, gone)).toBeUndefined()
  })

  it("is nothing when the delta has no operations", () => {
    const page = tree()

    expect(partInQuestion(page, wrap(page, []))).toBeUndefined()
  })

  /**
   * One part, ever. Three previews stacked inside one question is a quiz, and
   * the whole account of a delta of six is one click down, unchanged.
   */
  it("previews the first operation and only the first", () => {
    const page = tree()
    const both = wrap(page, [...deltaFor("trim", page).operations, ...deltaFor("promote", page).operations])

    expect(partInQuestion(page, both)?.tree.root.type).toBe("loom.stat-grid")
  })

  /**
   * The excerpt is this page, at this revision, from one node down — so it
   * carries the page's identity rather than minting one. Nothing here writes,
   * commits or proposes; a preview that invented a tree id would be a second
   * tree as far as anything reading the value could tell.
   */
  it("keeps the identity of the page it came out of", () => {
    const page = tree()
    const part = partInQuestion(page, deltaFor("trim", page))

    expect(part?.tree.treeId).toBe(page.treeId)
    expect(part?.tree.revision).toBe(page.revision)
  })

  /**
   * The lead is the one sentence on this preview and there is no disclosure
   * under it, so it is held to the rail's own rule: plain first, and the
   * machinery has a name a visitor has not earned yet.
   *
   * The list is `what-happens.test.tsx`'s, which is where this surface keeps
   * the vocabulary a stranger must not meet before a record has attached it to
   * something.
   */
  it("says what would happen in words a stranger has already been given", () => {
    const page = tree()
    const leads = ["trim", "band", "promote"].map((id) => partInQuestion(page, deltaFor(id, page))?.lead ?? "")

    expect(leads.filter((lead) => lead === "")).toEqual([])

    for (const lead of leads) {
      const words = lead.toLowerCase()

      for (const term of ["proposal", "delta", "revision", "policy", "primitive", "tree", "gate", "node"]) {
        expect(words, `${lead} says ${term}`).not.toContain(term)
      }

      /** Conditional throughout: nothing here has happened, and it is still refusable. */
      expect(words).toContain("would")
    }
  })
})

/**
 * And the third moment, which is the same walk with two refusals of its own.
 *
 * The lead here is in the past tense and makes a claim about the page — *this
 * came off it* — where the other two are conditional and make a claim about a
 * proposal. Two things have to be true for that sentence to be honest, and
 * both are checked here rather than left to the caller that chose the moment.
 * `kept.test.ts` has the same properties over the real write path; these are
 * the refusals themselves, reachable with one hand-written operation each.
 */
describe("the part a change is still holding", () => {
  /** An insert carrying a node the page does not have: the only honest case. */
  it("draws an insert of a node the tree has never had", () => {
    const page = tree()
    const stats = findNode(page.root, statsId(page))

    expect(stats).not.toBeNull()

    const elsewhere: LoomTree = {
      ...page,
      root: {
        ...page.root,
        children: page.root.children.filter((child) => child !== stats),
      },
    }

    const part = partFromOperations(
      elsewhere,
      [{ op: "insert", parentId: elsewhere.root.id, index: 0, node: stats! }],
      "kept"
    )

    expect(part?.tree.root.id).toBe(stats!.id)
    expect(part?.where).toBe("kept")
    expect(part?.lead).toBe("This is what came off the page. The record is still holding it.")
  })

  /**
   * **And refuses the same operation when the node is on the page**, which is
   * what withdraws the excerpt the moment an undo lands: the nodes come back
   * with the ids they had (0032), and nothing has to be told.
   */
  it("refuses to draw a node the page already has", () => {
    const page = tree()
    const stats = findNode(page.root, statsId(page))

    expect(stats).not.toBeNull()
    expect(
      partFromOperations(page, [{ op: "insert", parentId: page.root.id, index: 0, node: stats! }], "kept")
    ).toBeUndefined()
  })

  /**
   * **And refuses every operation that is not an insert**, which is what makes
   * one lead string correct rather than merely usual. The inverse of a
   * configure or a move names a node still on the stage, and *this is what
   * came off the page* over a band three inches away is the card contradicting
   * the page.
   */
  it("refuses a moment whose operation could not have taken anything off", () => {
    const page = tree()
    const id = statsId(page)

    for (const operation of [
      { op: "remove", nodeId: id },
      { op: "move", nodeId: id, parentId: page.root.id, index: 0 },
      { op: "configure", nodeId: id, set: { columns: 2 }, unset: [] },
    ] as const satisfies readonly TreeOperation[]) {
      expect(partFromOperations(page, [operation], "kept"), operation.op).toBeUndefined()
      /** And the same operation in either conditional moment still draws. */
      expect(partFromOperations(page, [operation], "question"), operation.op).toBeDefined()
    }
  })
})
