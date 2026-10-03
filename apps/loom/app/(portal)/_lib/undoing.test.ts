import { describe, expect, it } from "vitest"

import {
  sequentialIdFactory,
  type IrreversibilityReason,
  type PrimitiveType,
  type ProposalId,
  type TreeId,
} from "@jam-overture/loom"
import { recordOf, type AssessmentSummary } from "@jam-overture/loom/telemetry"
import { buildAssessment, buildProposal } from "@jam-overture/loom/testing"

import { runtimeWordsIn } from "@/app/(portal)/_test/plain-language"

import { hasUndoObstacle, undoStandingOf } from "./undoing"
import { IRREVERSIBILITY_PLAIN } from "./vocabulary"

const treeId = "t_undo" as TreeId
const aForm = "loom.form" as PrimitiveType

/**
 * A summary, with only the fields this reading looks at stated.
 *
 * Deliberately *not* the runtime's double. `buildAssessment` derives
 * `reversible` from the reasons — correctly, and that is the point of 0216 — so
 * it cannot produce the two records this module exists to handle: a stored
 * record whose flag and reasons disagree. Those come from here, and everything
 * that *is* reachable from a run of Loom is checked against the real thing in
 * the contract block at the bottom.
 */
const summary = (fields: Partial<AssessmentSummary>): AssessmentSummary => ({
  proposalId: "p_undo" as ProposalId,
  stakes: "low",
  reversible: true,
  operationCount: 1,
  insertedNodeCount: 0,
  removedNodeCount: 0,
  movedNodeCount: 0,
  configuredNodeCount: 1,
  touchedPrimitiveTypes: [],
  shallowestAffectedDepth: 1,
  retainedNodeCount: 0,
  irreversibilityReasons: [],
  ...fields,
})

describe("undoStandingOf", () => {
  it("says an undoable change is undoable and finds nothing to draw", () => {
    const standing = undoStandingOf(summary({ reversible: true }))

    expect(standing.undoable).toBe(true)
    expect(standing.obstacles).toEqual([])
    expect(standing.unexplained).toBe(false)
    expect(hasUndoObstacle(standing)).toBe(false)
  })

  it("names the out-of-tree effect, and tells the reader what to go and look at", () => {
    const standing = undoStandingOf(
      summary({ reversible: false, irreversibilityReasons: ["out-of-tree-effect"] })
    )

    expect(standing.undoable).toBe(false)
    expect(hasUndoObstacle(standing)).toBe(true)
    expect(standing.obstacles).toHaveLength(1)
    expect(standing.obstacles[0]?.technical).toBe("out-of-tree-effect")
    expect(standing.obstacles[0]?.meaning).toContain("before you say yes")
  })

  /**
   * The count is the whole value of this one. "More than this project keeps" is
   * a rule; "the 9 parts it takes off the page" is what somebody is about to
   * lose, and it is the number a reader weighs the decision against.
   */
  it("splices the retained count into the budget sentence", () => {
    const standing = undoStandingOf(
      summary({
        reversible: false,
        removedNodeCount: 9,
        retainedNodeCount: 9,
        irreversibilityReasons: ["retention-budget-exceeded"],
      })
    )

    expect(standing.obstacles[0]?.meaning).toContain("This one takes 9 parts off the page.")
  })

  it("counts one removed part in the singular", () => {
    const standing = undoStandingOf(
      summary({
        reversible: false,
        retainedNodeCount: 1,
        irreversibilityReasons: ["retention-budget-exceeded"],
      })
    )

    expect(standing.obstacles[0]?.meaning).toContain("This one takes 1 part off the page.")
  })

  /**
   * A budget exceeded by a change that removed nothing is a record contradicting
   * itself — `retainedNodeCount` *is* the removed count. The sentence stays and
   * the arithmetic is left off rather than printed as "the 0 parts".
   */
  it("leaves the count out when the record says nothing was removed", () => {
    const standing = undoStandingOf(
      summary({
        reversible: false,
        retainedNodeCount: 0,
        irreversibilityReasons: ["retention-budget-exceeded"],
      })
    )

    expect(standing.obstacles[0]?.meaning).toBe(
      IRREVERSIBILITY_PLAIN["retention-budget-exceeded"].meaning
    )
    expect(standing.obstacles[0]?.meaning).not.toContain("This one takes")
  })

  /** Both can fire on one change, and the record keeps the Gate's order. */
  it("keeps both obstacles, in the order the record holds them", () => {
    const standing = undoStandingOf(
      summary({
        reversible: false,
        retainedNodeCount: 3,
        irreversibilityReasons: ["out-of-tree-effect", "retention-budget-exceeded"],
      })
    )

    expect(standing.obstacles.map((obstacle) => obstacle.technical)).toEqual([
      "out-of-tree-effect",
      "retention-budget-exceeded",
    ])
  })

  /**
   * The case the governing rule is actually about. A code this portal has no
   * sentence for must not be dropped: a reader shown a warning and an empty
   * list cannot tell that from a record with no reason in it, and those are
   * different things.
   */
  it("keeps a code it has no words for, unreworded", () => {
    const standing = undoStandingOf(
      summary({ reversible: false, irreversibilityReasons: ["spends-a-budget-invented-later"] })
    )

    expect(standing.obstacles).toHaveLength(1)
    expect(standing.obstacles[0]?.technical).toBe("spends-a-budget-invented-later")
    expect(standing.obstacles[0]?.label).toContain("no words for")
    expect(standing.unexplained).toBe(false)
  })

  it("says so when the record warns and gives no reason", () => {
    const standing = undoStandingOf(summary({ reversible: false, irreversibilityReasons: [] }))

    expect(standing.unexplained).toBe(true)
    expect(standing.obstacles).toEqual([])
    expect(hasUndoObstacle(standing)).toBe(true)
  })

  /**
   * `reversible` leads, always. It is what the Gate acted on and what the
   * reader was already told one line above, so a record whose reasons disagree
   * with it must not have the headline quietly rewritten underneath.
   */
  it("reads the flag rather than inferring it from the reasons", () => {
    const standing = undoStandingOf(
      summary({ reversible: true, irreversibilityReasons: ["out-of-tree-effect"] })
    )

    expect(standing.undoable).toBe(true)
    expect(standing.obstacles).toHaveLength(1)
    expect(hasUndoObstacle(standing)).toBe(true)
  })
})

/**
 * Every sentence a reader meets here, held to the rule the whole redirection is.
 *
 * `out-of-tree-effect` is the dangerous one: the honest explanation of it is
 * about a *primitive whose configuration reaches outside the tree*, and three
 * of those words are the runtime's.
 */
describe("the sentences", () => {
  it("says none of the runtime's words unasked", () => {
    for (const word of Object.values(IRREVERSIBILITY_PLAIN)) {
      expect(runtimeWordsIn(word.label)).toEqual([])
      expect(runtimeWordsIn(word.meaning)).toEqual([])
    }
  })

  it("keeps the runtime's own code for the record", () => {
    for (const [code, word] of Object.entries(IRREVERSIBILITY_PLAIN)) {
      expect(word.technical).toBe(code)
    }
  })

  /** A label is read beside a verdict, so it is a clause and not a paragraph. */
  it("keeps each label short enough to lead a line", () => {
    for (const word of Object.values(IRREVERSIBILITY_PLAIN)) {
      expect(word.label.length).toBeLessThanOrEqual(60)
      expect(word.label).not.toContain(".")
    }
  })
})

/**
 * The half TypeScript cannot check, against the real runtime.
 *
 * `IRREVERSIBILITY_PLAIN` is keyed by `IrreversibilityReason["code"]`, so a
 * third obstacle added to that union stops this route group compiling. What the
 * types cannot see is the journey in between: the journal records the reasons as
 * `readonly string[]` (`assessmentSummarySchema`), deliberately, so that a
 * record outlives the version that wrote it. The key in the table and the string
 * in the record are therefore two things that merely *look* equal, and nothing
 * would fail if they stopped being.
 *
 * So this builds a real assessment through the published double, narrates it
 * through the real `recordOf`, and reads the result. If the runtime renames a
 * code, re-spells it on the way into the journal, or stops putting it there,
 * this goes red here rather than on a deployment's screen.
 */
describe("against a record the runtime actually wrote", () => {
  const summaryOf = (reasons: readonly IrreversibilityReason[], removedNodeCount: number) => {
    const ids = sequentialIdFactory("u")
    const proposal = buildProposal(ids, {
      intentId: ids.intentId(),
      delta: { deltaId: ids.deltaId(), treeId, baseRevision: 0, operations: [] },
    })

    const record = recordOf({
      treeId,
      occurredAt: "2026-10-03T00:00:00.000Z",
      event: {
        type: "change-assessed",
        assessment: buildAssessment(ids, {
          proposal,
          analysis: { operationCount: 1, removedNodeCount },
          irreversibilityReasons: reasons,
        }),
      },
    })

    if (record.event.type !== "change-assessed") throw new Error("narrated the wrong event")

    return record.event.assessment
  }

  it("has a sentence for an out-of-tree effect the runtime produced", () => {
    const standing = undoStandingOf(
      summaryOf([{ code: "out-of-tree-effect", primitiveTypes: [aForm] }], 0)
    )

    expect(standing.undoable).toBe(false)
    expect(standing.obstacles.map((obstacle) => obstacle.technical)).toEqual([
      "out-of-tree-effect",
    ])
    expect(standing.unexplained).toBe(false)
  })

  /**
   * And the retained count comes from the runtime's own arithmetic rather than
   * from the fixture: `buildAssessment` sets it from `removedNodeCount`, which
   * is what `assessReversibility` does.
   */
  it("reads the retained count the runtime derived", () => {
    const standing = undoStandingOf(
      summaryOf([{ code: "retention-budget-exceeded", retainedNodeCount: 7, budget: 4 }], 7)
    )

    expect(standing.obstacles[0]?.technical).toBe("retention-budget-exceeded")
    expect(standing.obstacles[0]?.meaning).toContain("This one takes 7 parts off the page.")
  })

  it("finds nothing to say about a change the runtime called reversible", () => {
    expect(hasUndoObstacle(undoStandingOf(summaryOf([], 0)))).toBe(false)
  })

  /**
   * The guard that keeps the two above honest. If `irreversibilityReasons`
   * stopped arriving in the record — a field dropped, a narration changed —
   * every assertion above would pass over an empty list and report green, which
   * is the failure mode this lane disarmed a demo guard with on 8 September.
   */
  it("finds a code this portal knows for every reason the runtime can hold", () => {
    const every: readonly IrreversibilityReason[] = [
      { code: "out-of-tree-effect", primitiveTypes: [aForm] },
      { code: "retention-budget-exceeded", retainedNodeCount: 2, budget: 1 },
    ]

    const codes = summaryOf(every, 2).irreversibilityReasons

    expect(codes).toHaveLength(every.length)
    expect([...codes].sort()).toEqual(Object.keys(IRREVERSIBILITY_PLAIN).sort())

    const named = undoStandingOf(summaryOf(every, 2)).obstacles
    expect(named.map((obstacle) => obstacle.label)).not.toContain(
      "Loom gave a reason this screen has no words for"
    )
  })
})
