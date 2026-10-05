import { describe, expect, it } from "vitest"

import {
  sequentialIdFactory,
  type IrreversibilityReason,
  type PrimitiveType,
  type ProposalId,
  type TreeId,
} from "@jam-overture/loom"
import {
  memoryTelemetryJournal,
  recordOf,
  type AssessmentLookup,
  type TelemetryJournal,
} from "@jam-overture/loom/telemetry"
import { buildAssessment, buildProposal } from "@jam-overture/loom/testing"

import { checkUndo } from "./undo-check"

const treeId = "t_history" as TreeId
const aCard = "loom.card" as PrimitiveType

/**
 * A journal with judgments in it, written through the real narration.
 *
 * `recordOf` rather than a hand-built summary, for the reason 0216 gives and
 * this lane learned the hard way two days ago: a fixture that writes the record
 * itself can describe one no run of Loom produces, and the test goes on passing
 * while the screen draws something impossible.
 */
const journalWith = async (
  judged: readonly { readonly proposalId: string; readonly reasons: readonly IrreversibilityReason[] }[]
): Promise<TelemetryJournal> => {
  const journal = memoryTelemetryJournal()

  for (const one of judged) {
    const ids = sequentialIdFactory(one.proposalId.replace(/[^a-z0-9]/gu, ""))
    const proposal = {
      ...buildProposal(ids, {
        intentId: ids.intentId(),
        delta: { deltaId: ids.deltaId(), treeId, baseRevision: 0, operations: [] },
      }),
      proposalId: one.proposalId as ProposalId,
    }

    const written = await journal.record([
      recordOf({
        treeId,
        occurredAt: "2026-10-04T00:00:00.000Z",
        event: {
          type: "change-assessed",
          assessment: buildAssessment(ids, {
            proposal,
            analysis: { removedNodeCount: 9 },
            irreversibilityReasons: one.reasons,
          }),
        },
      }),
    ])

    if (!written.ok) throw new Error("could not stage the journal")
  }

  return journal
}

const shown = (rows: readonly (readonly [number, string])[]) =>
  rows.map(([revision, proposalId]) => ({ revision, proposalId: proposalId as ProposalId }))

describe("checkUndo", () => {
  it("answers by revision, which is what a row holds", async () => {
    const journal = await journalWith([
      { proposalId: "p_a", reasons: [{ code: "out-of-tree-effect", primitiveTypes: [aCard] }] },
    ])

    const check = await checkUndo(journal, treeId, shown([[4, "p_a"]]))

    expect(check.gap).toBeNull()
    expect(check.standings.get(4)?.undoable).toBe(false)
    expect(check.standings.get(4)?.obstacles[0]?.meaning).toContain("Check what Card is wired to")
  })

  /**
   * The common absence, and the one this screen must stay quiet about. A
   * revision the runtime authored — an undo, a repair — has no model's judgment
   * behind it, and a deployment with no journal configured has none for
   * anything. That is an answer, not a gap.
   */
  it("leaves a revision nothing was recorded about out of the map, with no gap", async () => {
    const journal = await journalWith([{ proposalId: "p_a", reasons: [] }])

    const check = await checkUndo(journal, treeId, shown([[4, "p_a"], [3, "p_missing"]]))

    expect(check.standings.has(3)).toBe(false)
    expect(check.gap).toBeNull()
  })

  it("says nothing at all about a page with no revisions on it", async () => {
    const journal = await journalWith([])

    const check = await checkUndo(journal, treeId, [])

    expect(check.standings.size).toBe(0)
    expect(check.gap).toBeNull()
  })

  /**
   * An empty journal is the state of every deployment that has never configured
   * one, and the screen must be *silent* on it rather than apologetic. A notice
   * on every history screen of every such deployment saying "couldn't check"
   * would be this surface's loudest sentence and its least useful.
   */
  it("is silent on a journal that holds nothing", async () => {
    const check = await checkUndo(memoryTelemetryJournal(), treeId, shown([[4, "p_a"]]))

    expect(check.standings.size).toBe(0)
    expect(check.gap).toBeNull()
  })

  /**
   * The screen's own ignorance, which is the one absence it must say out loud.
   * Silence here would draw the undo button over a change that took a payment
   * with nothing to distinguish it from one that did not.
   */
  it("says so, once, when the journal would not answer", async () => {
    const refusing: TelemetryJournal = {
      ...memoryTelemetryJournal(),
      assessments: (_request: AssessmentLookup) =>
        Promise.resolve({
          ok: false as const,
          error: { code: "unavailable" as const, detail: "the journal is not reachable" },
        }),
    }

    const check = await checkUndo(refusing, treeId, shown([[4, "p_a"]]))

    expect(check.standings.size).toBe(0)
    expect(check.gap?.reading).toContain("couldn’t check")
    expect(check.gap?.technical).toContain("the journal is not reachable")
  })

  /**
   * The other half of the framework's own warning: *not looked up* and *nothing
   * recorded* must not be the same empty answer. This one is unreachable in
   * practice — the cap is deliberately wider than the store's widest page — and
   * is held anyway, because "unreachable" is a claim about two numbers in two
   * packages.
   */
  it("names how many it did not reach when a lookup is truncated", async () => {
    const truncating: TelemetryJournal = {
      ...memoryTelemetryJournal(),
      assessments: () =>
        Promise.resolve({
          ok: true as const,
          value: { assessments: new Map(), unasked: ["p_old" as ProposalId] },
        }),
    }

    const check = await checkUndo(truncating, treeId, shown([[4, "p_a"], [3, "p_old"]]))

    expect(check.gap?.reading).toContain("all but 1 of them")
    expect(check.gap?.technical).toBeUndefined()
  })

  it("asks only about the revisions on screen, and scopes the lookup to the page", async () => {
    let asked: AssessmentLookup | undefined
    const watching: TelemetryJournal = {
      ...memoryTelemetryJournal(),
      assessments: (request) => {
        asked = request

        return Promise.resolve({
          ok: true as const,
          value: { assessments: new Map(), unasked: [] },
        })
      },
    }

    await checkUndo(watching, treeId, shown([[4, "p_a"], [3, "p_b"]]))

    expect(asked?.proposalIds).toEqual(["p_a", "p_b"])
    expect(asked?.treeId).toBe(treeId)
  })
})
