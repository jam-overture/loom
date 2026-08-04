import { describe, expect, it } from "vitest"

import { sequentialIdFactory, type NodeId } from "../ids.js"
import { err, ok } from "../result.js"
import type { Provenance } from "../runtime/proposal.js"
import { FIXED_INSTANT } from "../testing/doubles.js"
import { sampleTree, type SampleTree } from "../testing/fixtures.js"
import { applyDelta } from "../tree/apply.js"
import { buildElement, buildText } from "../tree/builders.js"
import type { TreeOperation } from "../tree/delta.js"
import { findNode } from "../tree/navigation.js"
import type { LoomTree } from "../tree/tree.js"

import type { StoreError } from "./errors.js"
import { memoryTreeStore } from "./memory.js"
import { describeRevertPlan, planRevert, type RevertPlan } from "./revert.js"
import type { StoredRevision, TreeReader, TreeStore } from "./store.js"

const spare = sequentialIdFactory("plan")

const provenance: Provenance = {
  origin: "user-instruction",
  interpreter: "test",
  authoredBy: "model",
  confidence: 0.9,
  interpretedAt: FIXED_INSTANT,
}

type History = {
  readonly store: TreeStore
  readonly seed: LoomTree
  readonly ids: SampleTree["ids"]
  /** Appends one revision, whatever head currently is. */
  readonly append: (operations: readonly TreeOperation[]) => Promise<LoomTree>
  readonly head: () => Promise<LoomTree>
}

const historyOf = async (): Promise<History> => {
  const { tree, ids } = sampleTree()
  const store = memoryTreeStore()
  await store.create(tree)

  const head = async (): Promise<LoomTree> => {
    const current = await store.head(tree.treeId)
    if (!current.ok) throw new Error(`head: ${current.error.code}`)

    return current.value
  }

  return {
    store,
    seed: tree,
    ids,
    head,
    append: async (operations) => {
      const current = await head()
      const appended = await store.append(tree.treeId, {
        proposalId: spare.proposalId(),
        delta: {
          deltaId: spare.deltaId(),
          treeId: tree.treeId,
          baseRevision: current.revision,
          operations,
        },
        provenance,
        appliedAt: FIXED_INSTANT,
      })

      if (!appended.ok) throw new Error(`append: ${appended.error.code}`)

      return appended.value
    },
  }
}

const setValue = (nodeId: NodeId, value: string): readonly TreeOperation[] => [
  { op: "configure", nodeId, set: { value }, unset: [] },
]

const planOf = async (
  reader: TreeReader,
  seed: LoomTree,
  revision: number
): Promise<RevertPlan> => {
  const planned = await planRevert(reader, { treeId: seed.treeId, revision, seed })
  if (!planned.ok) throw new Error(`plan: ${planned.error.code}`)

  return planned.value
}

/** Applies a plan's operations at head, which is what the write path will do. */
const undoAt = (head: LoomTree, operations: readonly TreeOperation[]): LoomTree => {
  const undone = applyDelta(head, {
    deltaId: spare.deltaId(),
    treeId: head.treeId,
    baseRevision: head.revision,
    operations,
  })

  if (!undone.ok) throw new Error(`undo: ${undone.error.code}`)

  return undone.value
}

const textOf = (tree: LoomTree, nodeId: NodeId): string | undefined => {
  const node = findNode(tree.root, nodeId)

  return node?.kind === "text" ? node.value : undefined
}

/** A reader over a log a real store could not produce, for the disagreements. */
const readerOver = (head: LoomTree, revisions: readonly StoredRevision[]): TreeReader => ({
  head: () => Promise.resolve(ok(head)),
  revisions: () => Promise.resolve(ok({ revisions, older: null, newer: null })),
})

describe("planRevert produces an undo", () => {
  it("undoes the head revision back to what stood before it", async () => {
    const history = await historyOf()
    await history.append([{ op: "remove", nodeId: history.ids.card }])

    const plan = await planOf(history.store, history.seed, 1)
    if (plan.outcome !== "revertable") throw new Error(plan.outcome)

    expect(plan.headRevision).toBe(1)
    expect(plan.target.revision).toBe(1)

    const undone = undoAt(await history.head(), plan.operations)

    expect(undone.root).toEqual(history.seed.root)
    /** The undo is a new revision, not a rewind: the log only grows (0016). */
    expect(undone.revision).toBe(2)
  })

  it("undoes an older revision, leaving the ones after it standing", async () => {
    const history = await historyOf()
    await history.append(setValue(history.ids.body, "second"))
    await history.append(setValue(history.ids.headline, "third"))

    const plan = await planOf(history.store, history.seed, 1)
    if (plan.outcome !== "revertable") throw new Error(plan.outcome)

    const undone = undoAt(await history.head(), plan.operations)

    expect(textOf(undone, history.ids.body)).toBe("Body copy")
    expect(textOf(undone, history.ids.headline)).toBe("third")
  })

  it("restores the subtree a removal destroyed, from the log alone", async () => {
    const history = await historyOf()
    await history.append([{ op: "remove", nodeId: history.ids.card }])
    await history.append(setValue(history.ids.headline, "later"))

    const plan = await planOf(history.store, history.seed, 1)
    if (plan.outcome !== "revertable") throw new Error(plan.outcome)

    const undone = undoAt(await history.head(), plan.operations)

    expect(textOf(undone, history.ids.body)).toBe("Body copy")
    expect(textOf(undone, history.ids.headline)).toBe("later")
  })

  it("replays from a checkpoint seed rather than only from revision 0", async () => {
    const history = await historyOf()
    const checkpoint = await history.append(setValue(history.ids.body, "second"))
    await history.append(setValue(history.ids.headline, "third"))

    const plan = await planOf(history.store, checkpoint, 2)
    if (plan.outcome !== "revertable") throw new Error(plan.outcome)

    expect(textOf(undoAt(await history.head(), plan.operations), history.ids.headline)).toBe(
      "Welcome"
    )
  })
})

/**
 * A plan reports what the undo would write over; it does not refuse it (0035).
 * The operations come back either way, because the Gate is what weighs the cost.
 */
describe("planRevert reports the work an undo would discard", () => {
  it("names the revisions that built on the one being undone", async () => {
    const history = await historyOf()
    await history.append(setValue(history.ids.body, "second"))
    await history.append(setValue(history.ids.body, "third"))

    const plan = await planOf(history.store, history.seed, 1)
    if (plan.outcome !== "revertable") throw new Error(plan.outcome)

    expect(plan.discards).toEqual([{ revision: 2, nodeIds: [history.ids.body] }])
    expect(plan.operations.length).toBeGreaterThan(0)
    expect(describeRevertPlan(plan)).toContain("discarding what revision 2 did")
  })

  /**
   * The undo of an insert is a bare remove, so only the original delta names
   * what was inserted. A later revision reaching into that subtree is exactly
   * the work the remove would take with it.
   */
  it("counts a later change inside a subtree the undo would remove", async () => {
    const history = await historyOf()
    const caption = buildText(spare, "Sale")
    const banner = buildElement(spare, { type: "loom.banner", children: [caption] })

    await history.append([
      { op: "insert", parentId: history.ids.page, index: 1, node: banner },
    ])
    await history.append(setValue(caption.id, "Half price"))

    const plan = await planOf(history.store, history.seed, 1)
    if (plan.outcome !== "revertable") throw new Error(plan.outcome)

    expect(plan.discards).toEqual([{ revision: 2, nodeIds: [caption.id] }])
  })

  it("does not count a later change to an untouched node", async () => {
    const history = await historyOf()
    await history.append(setValue(history.ids.body, "second"))
    await history.append(setValue(history.ids.headline, "third"))

    const plan = await planOf(history.store, history.seed, 1)
    if (plan.outcome !== "revertable") throw new Error(plan.outcome)

    expect(plan.discards).toEqual([])
    expect(describeRevertPlan(plan)).toBe("revision 1 can be undone at head 2")
  })

  it("names every revision that reached the same nodes, not only the first", async () => {
    const history = await historyOf()
    await history.append(setValue(history.ids.body, "second"))
    await history.append(setValue(history.ids.body, "third"))
    await history.append(setValue(history.ids.body, "fourth"))

    const plan = await planOf(history.store, history.seed, 1)
    if (plan.outcome !== "revertable") throw new Error(plan.outcome)

    expect(plan.discards.map((discarded) => discarded.revision)).toEqual([2, 3])
    expect(describeRevertPlan(plan)).toContain("revisions 2, 3")
  })
})

describe("planRevert bounds", () => {
  it("refuses revision 0, which is the seed rather than a change", async () => {
    const history = await historyOf()
    await history.append(setValue(history.ids.body, "second"))

    const plan = await planOf(history.store, history.seed, 0)
    if (plan.outcome !== "out-of-range") throw new Error(plan.outcome)

    expect(plan).toEqual({ outcome: "out-of-range", revision: 0, earliest: 1, headRevision: 1 })
  })

  it("refuses a revision beyond head", async () => {
    const history = await historyOf()
    await history.append(setValue(history.ids.body, "second"))

    expect((await planOf(history.store, history.seed, 2)).outcome).toBe("out-of-range")
  })

  it("refuses a revision the seed has already absorbed", async () => {
    const history = await historyOf()
    const checkpoint = await history.append(setValue(history.ids.body, "second"))
    await history.append(setValue(history.ids.headline, "third"))

    const plan = await planOf(history.store, checkpoint, 1)
    if (plan.outcome !== "out-of-range") throw new Error(plan.outcome)

    expect(plan.earliest).toBe(2)
  })

  it("reports the store's own failure rather than turning it into a verdict", async () => {
    const unavailable: StoreError = { code: "unavailable", detail: "down" }
    const reader: TreeReader = {
      head: () => Promise.resolve(err(unavailable)),
      revisions: () => Promise.resolve(err(unavailable)),
    }

    const planned = await planRevert(reader, {
      treeId: (await historyOf()).seed.treeId,
      revision: 1,
      seed: (await historyOf()).seed,
    })

    expect(!planned.ok && planned.error.code).toBe("unavailable")
  })
})

describe("planRevert on a log that does not add up", () => {
  it("reports a gap rather than replaying across it", async () => {
    const history = await historyOf()
    const applied = await history.append(setValue(history.ids.body, "second"))

    const page = await history.store.revisions(history.seed.treeId)
    if (!page.ok) throw new Error(page.error.code)

    const only = page.value.revisions[0]
    if (!only) throw new Error("no entries")

    const plan = await planOf(
      readerOver({ ...applied, revision: 2 }, [{ ...only, revision: 2 }]),
      history.seed,
      2
    )

    if (plan.outcome !== "unreplayable") throw new Error(plan.outcome)
    expect(plan.mismatch).toEqual({ code: "revision-gap", expected: 1, found: 2 })
  })

  it("reports a head that claims a revision the log does not hold", async () => {
    const history = await historyOf()
    const applied = await history.append(setValue(history.ids.body, "second"))

    const plan = await planOf(readerOver({ ...applied, revision: 3 }, []), history.seed, 3)

    if (plan.outcome !== "unreplayable") throw new Error(plan.outcome)
    expect(plan.mismatch).toEqual({ code: "revision-gap", expected: 1, found: 3 })
  })

  it("reports a delta that no longer applies to the tree the seed replays to", async () => {
    const history = await historyOf()
    const applied = await history.append(setValue(history.ids.body, "second"))

    const page = await history.store.revisions(history.seed.treeId)
    if (!page.ok) throw new Error(page.error.code)

    const only = page.value.revisions[0]
    if (!only) throw new Error("no entries")

    const foreign = spare.nodeId()
    const plan = await planOf(
      readerOver({ ...applied, revision: 2 }, [
        { ...only, revision: 1, delta: { ...only.delta, operations: setValue(foreign, "x") } },
        { ...only, revision: 2 },
      ]),
      history.seed,
      2
    )

    if (plan.outcome !== "unreplayable") throw new Error(plan.outcome)
    expect(plan.mismatch).toEqual({ code: "delta-rejected", revision: 1, detail: "node-not-found" })
  })

  /**
   * Inversion walks the delta forward as it inverts, so the only way to reach
   * it with a delta it cannot invert is to hand it a seed that is not this
   * tree's history.
   */
  it("reports a target it cannot invert against the replayed tree", async () => {
    const history = await historyOf()
    const applied = await history.append(setValue(history.ids.body, "second"))

    const page = await history.store.revisions(history.seed.treeId)
    if (!page.ok) throw new Error(page.error.code)

    const only = page.value.revisions[0]
    if (!only) throw new Error("no entries")

    const foreign = spare.nodeId()
    const plan = await planOf(
      readerOver(applied, [
        { ...only, revision: 1, delta: { ...only.delta, operations: setValue(foreign, "x") } },
      ]),
      history.seed,
      1
    )

    if (plan.outcome !== "uninvertible") throw new Error(plan.outcome)
    expect(plan.error.code).toBe("node-not-found")
    expect(describeRevertPlan(plan)).toContain("cannot be inverted")
  })
})

describe("describeRevertPlan", () => {
  it("says a plan is workable", async () => {
    const history = await historyOf()
    await history.append(setValue(history.ids.body, "second"))

    expect(describeRevertPlan(await planOf(history.store, history.seed, 1))).toBe(
      "revision 1 can be undone at head 1"
    )
  })

  it("says a revision is outside the span that can be reached", () => {
    expect(
      describeRevertPlan({ outcome: "out-of-range", revision: 9, earliest: 1, headRevision: 3 })
    ).toBe("revision 9 is outside 1–3")
  })

  it("says where a log jumps", () => {
    expect(
      describeRevertPlan({
        outcome: "unreplayable",
        mismatch: { code: "revision-gap", expected: 4, found: 7 },
      })
    ).toBe("the log jumps from 3 to 7")
  })
})
