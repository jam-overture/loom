import { describe, expect, it } from "vitest"

import { sequentialIdFactory, type NodeId } from "../ids.js"
import type { Provenance } from "../runtime/proposal.js"
import { defaultGatePolicy, gatePolicySchema, type GatePolicy } from "../runtime/policy.js"
import { memoryTreeStore } from "../store/memory.js"
import { planRevert } from "../store/revert.js"
import {
  collectingEventSink,
  fixedClock,
  scriptedRepairer,
  FIXED_INSTANT,
  type CollectingEventSink,
} from "../testing/doubles.js"
import { sampleTree, type SampleTree } from "../testing/fixtures.js"
import { buildElement, buildText } from "../tree/builders.js"
import type { TreeOperation } from "../tree/delta.js"
import { findNode } from "../tree/navigation.js"
import type { LoomTree } from "../tree/tree.js"

import { confirmHeld, type WritePath } from "./commit.js"
import { memoryHoldStore } from "./held.js"
import {
  describeRevertOutcome,
  REVERT_INTERPRETER,
  revertInterpreter,
  revertRevision,
  type RevertablePlan,
} from "./revert.js"

const spare = sequentialIdFactory("rev")

const provenance: Provenance = {
  origin: "user-instruction",
  interpreter: "test",
  confidence: 0.9,
  interpretedAt: FIXED_INSTANT,
}

type Harness = {
  readonly path: WritePath
  readonly events: CollectingEventSink
  readonly seed: LoomTree
  readonly ids: SampleTree["ids"]
  readonly append: (operations: readonly TreeOperation[]) => Promise<LoomTree>
  readonly head: () => Promise<LoomTree>
}

/**
 * A tree with a real log behind it and the one write path in front of it. No
 * interpreter is supplied: `revertRevision` brings its own, which is the whole
 * point of the seam.
 */
const harnessFor = async (policy: GatePolicy = defaultGatePolicy): Promise<Harness> => {
  const { tree, ids } = sampleTree()
  const store = memoryTreeStore()
  await store.create(tree)

  const events = collectingEventSink()

  const head = async (): Promise<LoomTree> => {
    const current = await store.head(tree.treeId)
    if (!current.ok) throw new Error(`head: ${current.error.code}`)

    return current.value
  }

  return {
    path: {
      store,
      holds: memoryHoldStore(),
      runtime: {
        /** Never called: every test here goes through the revert interpreter. */
        interpreter: { interpret: () => Promise.reject(new Error("interpreted a revert")) },
        policy,
        events,
        clock: fixedClock(),
        idFactory: spare,
      },
    },
    events,
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

const textOf = (tree: LoomTree, nodeId: NodeId): string | undefined => {
  const node = findNode(tree.root, nodeId)

  return node?.kind === "text" ? node.value : undefined
}

describe("revertRevision applies an undo through the pipeline", () => {
  it("undoes the change and appends a revision rather than removing one", async () => {
    const harness = await harnessFor()
    await harness.append(setValue(harness.ids.body, "changed"))

    const outcome = await revertRevision(harness.path, {
      treeId: harness.seed.treeId,
      revision: 1,
      seed: harness.seed,
      origin: "user-instruction",
      actor: "maintainer",
    })

    if (outcome.kind !== "committed") throw new Error(describeRevertOutcome(outcome))

    expect(outcome.tree.revision).toBe(2)
    expect(textOf(outcome.tree, harness.ids.body)).toBe("Body copy")
  })

  it("records the undo as its own entry in the log, with its own provenance", async () => {
    const harness = await harnessFor()
    await harness.append(setValue(harness.ids.body, "changed"))

    await revertRevision(harness.path, {
      treeId: harness.seed.treeId,
      revision: 1,
      seed: harness.seed,
      origin: "developer",
      actor: "maintainer",
    })

    const page = await harness.path.store.revisions(harness.seed.treeId)
    if (!page.ok) throw new Error(page.error.code)

    const undo = page.value.revisions[1]
    if (!undo) throw new Error("the undo did not reach the log")

    expect(undo.revision).toBe(2)
    expect(undo.provenance.interpreter).toBe(REVERT_INTERPRETER)
    expect(undo.provenance.origin).toBe("developer")
    expect(undo.provenance.actor).toBe("maintainer")
    /** Computed, not guessed — the one honest self-grade for an inversion. */
    expect(undo.provenance.confidence).toBe(1)
  })

  it("narrates the same stages any other change does", async () => {
    const harness = await harnessFor()
    await harness.append(setValue(harness.ids.body, "changed"))

    await revertRevision(harness.path, {
      treeId: harness.seed.treeId,
      revision: 1,
      seed: harness.seed,
      origin: "user-instruction",
    })

    expect(harness.events.types()).toEqual([
      "intent-received",
      "change-proposed",
      "change-assessed",
      "disposition-decided",
      "change-applied",
      "change-committed",
    ])
  })

  it("says in the rationale which revision it undoes", async () => {
    const harness = await harnessFor()
    await harness.append(setValue(harness.ids.body, "changed"))

    const outcome = await revertRevision(harness.path, {
      treeId: harness.seed.treeId,
      revision: 1,
      seed: harness.seed,
      origin: "user-instruction",
    })

    if (outcome.kind !== "committed") throw new Error(describeRevertOutcome(outcome))
    expect(outcome.proposal.rationale).toContain("Undoes revision 1")
  })

  /** An undo is a change, so it is itself in the log and itself undoable. */
  it("can undo an undo", async () => {
    const harness = await harnessFor()
    await harness.append(setValue(harness.ids.body, "changed"))

    await revertRevision(harness.path, {
      treeId: harness.seed.treeId,
      revision: 1,
      seed: harness.seed,
      origin: "user-instruction",
    })

    const outcome = await revertRevision(harness.path, {
      treeId: harness.seed.treeId,
      revision: 2,
      seed: harness.seed,
      origin: "user-instruction",
    })

    if (outcome.kind !== "committed") throw new Error(describeRevertOutcome(outcome))

    expect(outcome.tree.revision).toBe(3)
    expect(textOf(outcome.tree, harness.ids.body)).toBe("changed")
  })

  it("restores a removed subtree from the log", async () => {
    const harness = await harnessFor()
    await harness.append([{ op: "remove", nodeId: harness.ids.card }])

    const outcome = await revertRevision(harness.path, {
      treeId: harness.seed.treeId,
      revision: 1,
      seed: harness.seed,
      origin: "user-instruction",
    })

    if (outcome.kind !== "committed") throw new Error(describeRevertOutcome(outcome))
    expect(outcome.tree.root).toEqual(harness.seed.root)
  })
})

describe("revertRevision is judged, not privileged", () => {
  const protective = gatePolicySchema.parse({ protectedPrimitiveTypes: ["loom.card"] })

  it("is held for confirmation when the undo is above the origin's ceiling", async () => {
    const harness = await harnessFor(protective)
    await harness.append([{ op: "remove", nodeId: harness.ids.card }])

    const outcome = await revertRevision(harness.path, {
      treeId: harness.seed.treeId,
      revision: 1,
      seed: harness.seed,
      origin: "scheduled-adaptation",
    })

    if (outcome.kind !== "held") throw new Error(describeRevertOutcome(outcome))

    expect(outcome.held.disposition.reason.code).toBe("stakes-above-ceiling")
    expect((await harness.head()).revision).toBe(1)
  })

  it("applies a held undo once a human answers, and records who did", async () => {
    const harness = await harnessFor(protective)
    await harness.append([{ op: "remove", nodeId: harness.ids.card }])

    const held = await revertRevision(harness.path, {
      treeId: harness.seed.treeId,
      revision: 1,
      seed: harness.seed,
      origin: "scheduled-adaptation",
    })

    if (held.kind !== "held") throw new Error(describeRevertOutcome(held))

    const confirmed = await confirmHeld(harness.path, {
      proposalId: held.held.proposalId,
      actor: "reviewer",
    })

    if (confirmed.kind !== "committed") throw new Error(confirmed.kind)

    expect(confirmed.tree.root).toEqual(harness.seed.root)

    const page = await harness.path.store.revisions(harness.seed.treeId)
    expect(page.ok && page.value.revisions[1]?.answeredBy).toBe("reviewer")
  })

  /** Undoing an insert destroys a protected primitive, which is not offered at all. */
  it("is refused outright when the undo reaches the refusal floor", async () => {
    const harness = await harnessFor(protective)
    const card = buildElement(spare, {
      type: "loom.card",
      children: [buildText(spare, "Promo")],
    })

    await harness.append([{ op: "insert", parentId: harness.ids.main, index: 1, node: card }])

    const outcome = await revertRevision(harness.path, {
      treeId: harness.seed.treeId,
      revision: 1,
      seed: harness.seed,
      origin: "developer",
    })

    if (outcome.kind !== "refused") throw new Error(describeRevertOutcome(outcome))

    expect(outcome.disposition.reason.code).toBe("stakes-at-refusal-floor")
    expect((await harness.head()).revision).toBe(1)
  })

  /**
   * Repair (0006) exists so a model can offer a smaller version of what was
   * refused. There is no smaller version of an undo, so the repairer never sees
   * it even when one is wired into the runtime.
   */
  it("never asks a repairer to soften a refused undo", async () => {
    const harness = await harnessFor(gatePolicySchema.parse({ protectedPrimitiveTypes: ["loom.card"] }))
    const repairer = scriptedRepairer({ ok: false, error: { code: "refused", detail: "no" } })
    const card = buildElement(spare, { type: "loom.card", children: [buildText(spare, "Promo")] })

    await harness.append([{ op: "insert", parentId: harness.ids.main, index: 1, node: card }])

    await revertRevision(
      { ...harness.path, runtime: { ...harness.path.runtime, repairer } },
      {
        treeId: harness.seed.treeId,
        revision: 1,
        seed: harness.seed,
        origin: "developer",
      }
    )

    expect(repairer.requests).toEqual([])
    expect(harness.events.types()).not.toContain("repair-requested")
  })
})

describe("revertRevision refuses to plan what it cannot plan", () => {
  it("proposes nothing when a later revision built on the target", async () => {
    const harness = await harnessFor()
    await harness.append(setValue(harness.ids.body, "second"))
    await harness.append(setValue(harness.ids.body, "third"))

    const outcome = await revertRevision(harness.path, {
      treeId: harness.seed.treeId,
      revision: 1,
      seed: harness.seed,
      origin: "user-instruction",
    })

    if (outcome.kind !== "not-revertable") throw new Error(outcome.kind)

    expect(outcome.plan.outcome).toBe("contested")
    expect(describeRevertOutcome(outcome)).toContain("built on by 2")
    /** Nothing was proposed, so nothing was narrated. */
    expect(harness.events.types()).toEqual([])
  })

  it("proposes nothing for a revision that is not in the log", async () => {
    const harness = await harnessFor()

    const outcome = await revertRevision(harness.path, {
      treeId: harness.seed.treeId,
      revision: 1,
      seed: harness.seed,
      origin: "user-instruction",
    })

    if (outcome.kind !== "not-revertable") throw new Error(outcome.kind)
    expect(outcome.plan.outcome).toBe("out-of-range")
  })

  it("reports a store that cannot be read as a write failure", async () => {
    const harness = await harnessFor()
    /** A tree id the store has never seen — sample trees all mint the same one. */
    const missing = { ...sampleTree().tree, treeId: spare.treeId() }

    const outcome = await revertRevision(harness.path, {
      treeId: missing.treeId,
      revision: 1,
      seed: missing,
      origin: "user-instruction",
    })

    if (outcome.kind !== "not-written") throw new Error(outcome.kind)
    expect(outcome.error.code).toBe("not-found")
  })
})

describe("revertInterpreter", () => {
  const planFor = async (): Promise<{
    readonly plan: RevertablePlan
    readonly harness: Harness
  }> => {
    const harness = await harnessFor()
    await harness.append(setValue(harness.ids.body, "changed"))

    const planned = await planRevert(harness.path.store, {
      treeId: harness.seed.treeId,
      revision: 1,
      seed: harness.seed,
    })

    if (!planned.ok || planned.value.outcome !== "revertable") throw new Error("not plannable")

    return { plan: planned.value, harness }
  }

  it("declines a tree at a revision it was not planned against", async () => {
    const { plan, harness } = await planFor()
    const interpreter = revertInterpreter(plan, spare, fixedClock())

    const interpreted = await interpreter.interpret(
      {
        intentId: spare.intentId(),
        treeId: harness.seed.treeId,
        baseRevision: 0,
        origin: "user-instruction",
        utterance: "undo",
        observedAt: FIXED_INSTANT,
      },
      harness.seed
    )

    expect(!interpreted.ok && interpreted.error.code).toBe("refused")
  })

  it("proposes against the tree it was planned for", async () => {
    const { plan, harness } = await planFor()
    const interpreter = revertInterpreter(plan, spare, fixedClock())

    const interpreted = await interpreter.interpret(
      {
        intentId: spare.intentId(),
        treeId: harness.seed.treeId,
        baseRevision: 1,
        origin: "user-instruction",
        utterance: "undo",
        observedAt: FIXED_INSTANT,
      },
      await harness.head()
    )

    expect(interpreted.ok && interpreted.value.delta.baseRevision).toBe(1)
    expect(interpreted.ok && interpreted.value.delta.operations).toEqual(plan.operations)
  })
})
