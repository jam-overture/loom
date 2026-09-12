import { describe, expect, it } from "vitest"

import { sequentialIdFactory, type TreeId } from "../ids.js"
import { FIXED_INSTANT, fixedClock } from "../testing/doubles.js"
import { sampleTree } from "../testing/fixtures.js"
import type { TreeOperation } from "../tree/delta.js"

import type { EditIntent } from "./intent.js"
import { inverseInterpreter, type ComputedInverse } from "./inverse.js"

const ids = sequentialIdFactory("inv")

const intentAt = (treeId: TreeId, baseRevision: number): EditIntent => ({
  intentId: ids.intentId(),
  treeId,
  baseRevision,
  origin: "user-instruction",
  actor: "a visitor",
  utterance: "Put it back.",
  observedAt: FIXED_INSTANT,
})

describe("inverseInterpreter", () => {
  const inverseOf = (
    operations: readonly TreeOperation[],
    headRevision: number,
    extra: Partial<ComputedInverse> = {}
  ): ComputedInverse => ({
    operations,
    headRevision,
    interpreter: "loom/test-undo",
    rationale: "Puts back the change above.",
    ...extra,
  })

  it("proposes the operations it was given, against the tree in hand", async () => {
    const { tree, ids: nodes } = sampleTree()
    const operations: readonly TreeOperation[] = [{ op: "remove", nodeId: nodes.card }]

    const interpreted = await inverseInterpreter(
      inverseOf(operations, tree.revision),
      ids,
      fixedClock()
    ).interpret(intentAt(tree.treeId, tree.revision), tree)

    if (!interpreted.ok) throw new Error(interpreted.error.detail)

    expect(interpreted.value.delta.operations).toEqual(operations)
    expect(interpreted.value.delta.baseRevision).toBe(tree.revision)
    expect(interpreted.value.delta.treeId).toBe(tree.treeId)
    expect(interpreted.value.rationale).toBe("Puts back the change above.")
  })

  /**
   * The stamp is the caller's because a reader uses it to decide whether a
   * record is an undo the runtime planned off a log. Defaulting it would let a
   * surface inherit a claim it cannot make.
   */
  it("stamps the interpreter the caller named, and nothing else", async () => {
    const { tree, ids: nodes } = sampleTree()

    const interpreted = await inverseInterpreter(
      inverseOf([{ op: "remove", nodeId: nodes.card }], tree.revision),
      ids,
      fixedClock()
    ).interpret(intentAt(tree.treeId, tree.revision), tree)

    if (!interpreted.ok) throw new Error(interpreted.error.detail)

    expect(interpreted.value.provenance.interpreter).toBe("loom/test-undo")
  })

  /** Computed, not guessed — so calibration segments it out (0031). */
  it("grades a computed undo as the runtime's, at full confidence", async () => {
    const { tree, ids: nodes } = sampleTree()

    const interpreted = await inverseInterpreter(
      inverseOf([{ op: "remove", nodeId: nodes.card }], tree.revision),
      ids,
      fixedClock()
    ).interpret(intentAt(tree.treeId, tree.revision), tree)

    if (!interpreted.ok) throw new Error(interpreted.error.detail)

    expect(interpreted.value.provenance.authoredBy).toBe("runtime")
    expect(interpreted.value.provenance.confidence).toBe(1)
    expect(interpreted.value.provenance.interpretedAt).toBe(FIXED_INSTANT)
  })

  it("carries the asker's origin and actor onto the proposal", async () => {
    const { tree, ids: nodes } = sampleTree()

    const interpreted = await inverseInterpreter(
      inverseOf([{ op: "remove", nodeId: nodes.card }], tree.revision),
      ids,
      fixedClock()
    ).interpret(intentAt(tree.treeId, tree.revision), tree)

    if (!interpreted.ok) throw new Error(interpreted.error.detail)

    expect(interpreted.value.provenance.origin).toBe("user-instruction")
    expect(interpreted.value.provenance.actor).toBe("a visitor")
  })

  /**
   * An inverse is the inverse of one arrangement. Offered against another it
   * would be proposing something whose reasoning has expired.
   */
  it("declines a tree at a revision the inverse was not computed against", async () => {
    const { tree, ids: nodes } = sampleTree()

    const interpreted = await inverseInterpreter(
      inverseOf([{ op: "remove", nodeId: nodes.card }], tree.revision + 1),
      ids,
      fixedClock()
    ).interpret(intentAt(tree.treeId, tree.revision), tree)

    expect(interpreted.ok).toBe(false)
    if (interpreted.ok) return

    expect(interpreted.error.code).toBe("refused")
    expect(interpreted.error.detail).toContain(`revision ${tree.revision + 1}`)
  })

  /**
   * Absence means "nobody looked at a log", which is every stateless caller, and
   * that reading has to stay true (0035). An empty list is the same statement as
   * no list, so neither is declared.
   */
  describe("discards", () => {
    it("declares nothing when the caller had no log to consult", async () => {
      const { tree, ids: nodes } = sampleTree()

      const interpreted = await inverseInterpreter(
        inverseOf([{ op: "remove", nodeId: nodes.card }], tree.revision),
        ids,
        fixedClock()
      ).interpret(intentAt(tree.treeId, tree.revision), tree)

      if (!interpreted.ok) throw new Error(interpreted.error.detail)

      expect("discards" in interpreted.value).toBe(false)
    })

    it("declares nothing when a log was consulted and was clean", async () => {
      const { tree, ids: nodes } = sampleTree()

      const interpreted = await inverseInterpreter(
        inverseOf([{ op: "remove", nodeId: nodes.card }], tree.revision, { discards: [] }),
        ids,
        fixedClock()
      ).interpret(intentAt(tree.treeId, tree.revision), tree)

      if (!interpreted.ok) throw new Error(interpreted.error.detail)

      expect("discards" in interpreted.value).toBe(false)
    })

    it("carries what the caller found, so the Gate can weigh it", async () => {
      const { tree, ids: nodes } = sampleTree()
      const discards = [{ revision: 4, nodeIds: [nodes.card] }]

      const interpreted = await inverseInterpreter(
        inverseOf([{ op: "remove", nodeId: nodes.card }], tree.revision, { discards }),
        ids,
        fixedClock()
      ).interpret(intentAt(tree.treeId, tree.revision), tree)

      if (!interpreted.ok) throw new Error(interpreted.error.detail)

      expect(interpreted.value.discards).toEqual(discards)
    })
  })
})
