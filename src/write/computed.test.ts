import { describe, expect, it } from "vitest"

import { sequentialIdFactory, type NodeId } from "../ids.js"
import { fixedPolicy } from "../runtime/policy-source.js"
import { defaultGatePolicy } from "../runtime/policy.js"
import type { CompositionRuntime } from "../runtime/pipeline.js"
import type { Provenance } from "../runtime/proposal.js"
import type { PropsVocabulary } from "../runtime/vocabulary.js"
import type { BindingReader } from "../render/reads.js"
import { memoryTreeStore } from "../store/memory.js"
import {
  collectingEventSink,
  fixedClock,
  scriptedRepairer,
  FIXED_INSTANT,
} from "../testing/doubles.js"
import { sampleTree } from "../testing/fixtures.js"
import { applyOperation } from "../tree/apply.js"
import type { TreeOperation } from "../tree/delta.js"
import type { LoomNode } from "../tree/node.js"
import { withRoot, type LoomTree } from "../tree/tree.js"

import { type WritePath } from "./commit.js"
import { computedChangeRuntime } from "./computed.js"
import { memoryHoldStore } from "./held.js"
import { reseedPage } from "./reseed.js"
import { revertRevision } from "./revert.js"

const spare = sequentialIdFactory("cmp")

const provenance: Provenance = {
  origin: "user-instruction",
  interpreter: "test",
  authoredBy: "model",
  confidence: 0.9,
  interpretedAt: FIXED_INSTANT,
}

/** Wired, and permissive: what is under test is whether it was consulted at all. */
const everyTypeValid: PropsVocabulary = () => ({ outcome: "valid" })
const readsNothing: BindingReader = { bindingsReadBy: () => undefined }

const neverInterpreted = { interpret: () => Promise.reject(new Error("interpreted")) }

const runtimeHolding = (): CompositionRuntime => ({
  interpreter: neverInterpreted,
  policySource: fixedPolicy(defaultGatePolicy),
  events: collectingEventSink(),
  clock: fixedClock(),
  idFactory: spare,
  repairer: scriptedRepairer({ ok: false, error: { code: "refused", detail: "no" } }),
  propsVocabulary: everyTypeValid,
  bindingReader: readsNothing,
})

describe("computedChangeRuntime carries every judging seam and drops only the repairer", () => {
  it("drops the repairer", () => {
    expect(computedChangeRuntime(runtimeHolding(), neverInterpreted).repairer).toBeUndefined()
  })

  it("replaces the interpreter with the computed one", () => {
    const interpreter = { interpret: () => Promise.reject(new Error("other")) }

    expect(computedChangeRuntime(runtimeHolding(), interpreter).interpreter).toBe(interpreter)
  })

  /**
   * The assertion that would have caught the defect this function exists to fix.
   *
   * `revertRevision` built its runtime as a literal naming five fields.
   * `propsVocabulary` and `bindingReader` landed afterwards, and a literal does
   * not fail to compile when the type it returns grows — it silently stops
   * passing the new field. Keyed on the whole key set rather than on the two
   * seams by name, so a seventh seam is covered by this test on the day it
   * lands rather than on the day somebody remembers to add it here.
   */
  it("carries every other field a runtime holds, by key, not by name", () => {
    const runtime = runtimeHolding()
    const carried = computedChangeRuntime(runtime, neverInterpreted)

    expect(new Set(Object.keys(carried))).toEqual(
      new Set(Object.keys(runtime).filter((key) => key !== "repairer"))
    )
    expect(carried.propsVocabulary).toBe(everyTypeValid)
    expect(carried.bindingReader).toBe(readsNothing)
  })
})

/**
 * The consequence, through the write path, on both computed changes.
 *
 * `wiredChecks` exists because the policy fingerprint cannot see a seam: a
 * deployment that wires a registry on Tuesday produces dispositions on Wednesday
 * whose fingerprint is byte-identical to Monday's, so without this field a
 * refusal rate that moved in the week somebody wired one is indistinguishable
 * from a fault (0248).
 *
 * A judgment that records a wired check as not wired is therefore worse than no
 * record at all — a later reading of the log cannot tell it from the truth. That
 * was the state of every undo in this repository, and it would have been the
 * state of every reseed had the revert path been copied as the pattern.
 */
describe("a computed change is judged by the seams the host wired", () => {
  const pathHolding = async (): Promise<{
    readonly path: WritePath
    readonly seed: LoomTree
    readonly ids: ReturnType<typeof sampleTree>["ids"]
    readonly edit: (operations: readonly TreeOperation[]) => Promise<LoomTree>
  }> => {
    const { tree, ids } = sampleTree()
    const store = memoryTreeStore()
    await store.create(tree)

    return {
      path: { store, holds: memoryHoldStore(), runtime: runtimeHolding() },
      seed: tree,
      ids,
      edit: async (operations) => {
        const head = await store.head(tree.treeId)
        if (!head.ok) throw new Error(head.error.code)

        const appended = await store.append(tree.treeId, {
          proposalId: spare.proposalId(),
          delta: {
            deltaId: spare.deltaId(),
            treeId: tree.treeId,
            baseRevision: head.value.revision,
            operations,
          },
          provenance,
          appliedAt: FIXED_INSTANT,
        })
        if (!appended.ok) throw new Error(appended.error.code)

        return appended.value
      },
    }
  }

  const setValue = (nodeId: NodeId, value: string): readonly TreeOperation[] => [
    { op: "configure", nodeId, set: { value }, unset: [] },
  ]

  const authoredWith = (...operations: readonly TreeOperation[]): LoomTree => {
    const start = sampleTree().tree

    const reached = operations.reduce<LoomNode>((root, operation) => {
      const applied = applyOperation(root, operation)
      if (!applied.ok) throw new Error(applied.error.code)

      return applied.value
    }, start.root)

    if (reached.kind !== "element") throw new Error("authored: root")

    return withRoot(start, reached)
  }

  it("records both wired checks on an undo", async () => {
    const { path, seed, ids, edit } = await pathHolding()
    await edit(setValue(ids.headline, "changed"))

    const outcome = await revertRevision(path, {
      treeId: seed.treeId,
      revision: 1,
      seed,
      origin: "developer",
    })
    if (outcome.kind !== "committed") throw new Error(outcome.kind)

    expect(outcome.disposition.wiredChecks).toEqual(["props", "bindings"])
  })

  it("records both wired checks on a reseed", async () => {
    const { path, seed, ids } = await pathHolding()

    const outcome = await reseedPage(path, {
      treeId: seed.treeId,
      authored: authoredWith(...setValue(ids.headline, "A new headline")),
      origin: "developer",
    })
    if (outcome.kind !== "committed") throw new Error(outcome.kind)

    expect(outcome.disposition.wiredChecks).toEqual(["props", "bindings"])
  })

  /**
   * The other half of the field's meaning, so the assertions above are read as
   * *these were wired* rather than as *this list is always full*: empty means
   * the runtime was asked and held neither, which is a different fact from the
   * field being absent.
   */
  it("records an empty list, not both, when the host wired neither", async () => {
    const { path, seed, ids } = await pathHolding()
    const { repairer: _norepair, propsVocabulary: _noprops, bindingReader: _noreads, ...bare } =
      path.runtime

    const outcome = await reseedPage(
      { ...path, runtime: bare },
      {
        treeId: seed.treeId,
        authored: authoredWith(...setValue(ids.headline, "A new headline")),
        origin: "developer",
      }
    )
    if (outcome.kind !== "committed") throw new Error(outcome.kind)

    expect(outcome.disposition.wiredChecks).toEqual([])
  })
})
