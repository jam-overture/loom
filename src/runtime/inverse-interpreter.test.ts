import { describe, expect, it } from "vitest"

import { sequentialIdFactory } from "../ids.js"
import { buildIntent, fixedClock, FIXED_INSTANT } from "../testing/doubles.js"
import { sampleTree } from "../testing/fixtures.js"
import { applyDelta } from "../tree/apply.js"
import type { TreeDelta, TreeOperation } from "../tree/delta.js"

import { analyzeDelta } from "./analysis.js"
import { inverseInterpreter, type InverseTerms } from "./inverse-interpreter.js"
import { defaultGatePolicy } from "./policy.js"
import { assessReversibility } from "./reversibility.js"

const spare = sequentialIdFactory("inv")

const TERMS: InverseTerms = {
  interpreter: "loom/test-undo",
  rationale: "Puts the card back.",
}

/**
 * A change and the inverse of it, computed the way a stateless caller gets one:
 * out of the assessment of its own change, with no log anywhere.
 */
const changeAndInverse = (build: (ids: ReturnType<typeof sampleTree>["ids"]) => TreeOperation[]) => {
  const { tree, ids } = sampleTree()
  const delta: TreeDelta = {
    deltaId: spare.deltaId(),
    treeId: tree.treeId,
    baseRevision: tree.revision,
    operations: build(ids),
  }

  const analysis = analyzeDelta(tree, delta)
  if (!analysis.ok) throw new Error(analysis.error.code)

  const reversibility = assessReversibility(
    tree,
    delta,
    analysis.value,
    defaultGatePolicy,
    spare.deltaId()
  )
  if (!reversibility.ok) throw new Error(reversibility.error.code)

  const changed = applyDelta(tree, delta)
  if (!changed.ok) throw new Error(changed.error.code)

  return { before: tree, changed: changed.value, inverse: reversibility.value.inverse }
}

const interpretAgainst = async (
  inverse: TreeDelta,
  tree: ReturnType<typeof changeAndInverse>["changed"],
  terms: InverseTerms = TERMS
) => {
  const interpreter = inverseInterpreter(inverse, terms, spare, fixedClock())

  return interpreter.interpret(
    buildIntent(spare, { treeId: tree.treeId, baseRevision: tree.revision, utterance: "put it back" }),
    tree
  )
}

describe("inverseInterpreter", () => {
  /**
   * The whole reason this exists: no store, no replay, no revision number — an
   * inverse held in memory becomes a proposal that restores the tree.
   */
  it("proposes a delta that puts the tree back where it was", async () => {
    const { before, changed, inverse } = changeAndInverse((ids) => [
      { op: "remove", nodeId: ids.card },
    ])

    const interpreted = await interpretAgainst(inverse, changed)
    if (!interpreted.ok) throw new Error(interpreted.error.code)

    const undone = applyDelta(changed, interpreted.value.delta)
    expect(undone.ok && undone.value.root).toEqual(before.root)
  })

  it("proposes against the tree the inverse was computed for", async () => {
    const { changed, inverse } = changeAndInverse((ids) => [{ op: "remove", nodeId: ids.card }])

    const interpreted = await interpretAgainst(inverse, changed)

    expect(interpreted.ok && interpreted.value.delta.baseRevision).toBe(changed.revision)
    expect(interpreted.ok && interpreted.value.delta.operations).toEqual(inverse.operations)
  })

  /**
   * An inverse is computed against one arrangement of a tree. Offered against
   * another it would be proposing something whose reasoning has expired.
   */
  it("declines a tree at a revision the inverse was not computed against", async () => {
    const { before, changed, inverse } = changeAndInverse((ids) => [
      { op: "remove", nodeId: ids.card },
    ])

    const interpreted = await interpretAgainst(inverse, before)

    expect(!interpreted.ok && interpreted.error.code).toBe("refused")
    expect(!interpreted.ok && interpreted.error.detail).toContain(String(changed.revision))
  })

  it("stamps the interpreter it was given, and grades a computed inverse as the runtime's", async () => {
    const { changed, inverse } = changeAndInverse((ids) => [{ op: "remove", nodeId: ids.card }])

    const interpreted = await interpretAgainst(inverse, changed)
    if (!interpreted.ok) throw new Error(interpreted.error.code)

    expect(interpreted.value.provenance.interpreter).toBe("loom/test-undo")
    expect(interpreted.value.provenance.authoredBy).toBe("runtime")
    expect(interpreted.value.provenance.confidence).toBe(1)
    expect(interpreted.value.provenance.interpretedAt).toBe(FIXED_INSTANT)
    expect(interpreted.value.rationale).toBe("Puts the card back.")
  })

  it("carries the asker's origin and actor onto the proposal", async () => {
    const { changed, inverse } = changeAndInverse((ids) => [{ op: "remove", nodeId: ids.card }])
    const interpreter = inverseInterpreter(inverse, TERMS, spare, fixedClock())

    const interpreted = await interpreter.interpret(
      buildIntent(spare, {
        treeId: changed.treeId,
        baseRevision: changed.revision,
        origin: "user-instruction",
        actor: "a visitor",
      }),
      changed
    )

    expect(interpreted.ok && interpreted.value.provenance.origin).toBe("user-instruction")
    expect(interpreted.ok && interpreted.value.provenance.actor).toBe("a visitor")
  })

  /**
   * Absence has to keep meaning "nobody looked at a log" rather than "a log was
   * checked and was clean" (0035), so a stateless caller — which is every caller
   * that has no log — must not declare an empty one.
   */
  it("declares no discards when the caller has none to declare", async () => {
    const { changed, inverse } = changeAndInverse((ids) => [{ op: "remove", nodeId: ids.card }])

    const interpreted = await interpretAgainst(inverse, changed)

    expect(interpreted.ok && "discards" in interpreted.value).toBe(false)
  })

  it("omits an empty discards list rather than declaring one", async () => {
    const { changed, inverse } = changeAndInverse((ids) => [{ op: "remove", nodeId: ids.card }])

    const interpreted = await interpretAgainst(inverse, changed, { ...TERMS, discards: [] })

    expect(interpreted.ok && "discards" in interpreted.value).toBe(false)
  })

  it("passes on discards the caller did declare", async () => {
    const { changed, inverse } = changeAndInverse((ids) => [{ op: "remove", nodeId: ids.card }])
    const discards = [{ revision: 2, nodeIds: [changed.root.id] }]

    const interpreted = await interpretAgainst(inverse, changed, { ...TERMS, discards })

    expect(interpreted.ok && interpreted.value.discards).toEqual(discards)
  })

  /**
   * A surface undoing a change it made in the same session has no revision to
   * name — nothing was appended — and a number it does not have would be worse
   * on the record than the absence.
   */
  it("records no undone revision when the caller has none to name", async () => {
    const { changed, inverse } = changeAndInverse((ids) => [{ op: "remove", nodeId: ids.card }])

    const interpreted = await interpretAgainst(inverse, changed)

    expect(interpreted.ok && "undoes" in interpreted.value.provenance).toBe(false)
  })

  it("records the revision the caller named", async () => {
    const { changed, inverse } = changeAndInverse((ids) => [{ op: "remove", nodeId: ids.card }])

    const interpreted = await interpretAgainst(inverse, changed, { ...TERMS, undoes: 2 })

    expect(interpreted.ok && interpreted.value.provenance.undoes).toBe(2)
  })
})
