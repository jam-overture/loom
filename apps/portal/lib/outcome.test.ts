import { describe, expect, it } from "vitest"

import {
  buildElement,
  buildText,
  createTree,
  deltaIdSchema,
  intentIdSchema,
  nodeIdSchema,
  proposalIdSchema,
  sequentialIdFactory,
  treeIdSchema,
  type ProposedChange,
  type TreeDelta,
} from "@loom/runtime"
import type { RevertOutcome, WriteOutcome } from "@loom/runtime/write"

import { reportOf, revertReportOf, toneClasses, type OutcomeTone } from "./outcome"

const treeId = treeIdSchema.parse("t_1")
const proposalId = proposalIdSchema.parse("p_1")
const intentId = intentIdSchema.parse("i_1")

const emptyDelta = (baseRevision: number): TreeDelta => ({
  deltaId: deltaIdSchema.parse("d_1"),
  treeId,
  baseRevision,
  operations: [],
})

const proposal = (confidence: number): ProposedChange => ({
  proposalId,
  intentId,
  delta: emptyDelta(2),
  rationale: "because the heading was asked to change",
  provenance: {
    origin: "user-instruction",
    interpreter: "test",
    authoredBy: "model",
    confidence,
    interpretedAt: "2026-07-30T00:00:00.000Z",
  },
})

const tree = (() => {
  const ids = sequentialIdFactory("outcome")

  return createTree(
    buildElement(ids, { type: "loom.page", children: [buildText(ids, "Loom")] }),
    ids
  )
})()

/**
 * Every kind a write can end in. Written out rather than derived, so adding a
 * member to `WriteOutcome` fails this file instead of silently rendering as
 * whatever the last branch happened to be.
 */
const everyOutcome: readonly WriteOutcome[] = [
  {
    kind: "committed",
    tree,
    proposal: proposal(0.9),
    disposition: {
      kind: "accepted",
      reason: { code: "within-policy", detail: "small, deep, reversible" },
      stakes: "low",
      reversible: true,
      confidence: 0.9,
      policyId: "default",
    },
    inverse: emptyDelta(3),
  },
  {
    kind: "held",
    held: {
      proposalId,
      treeId,
      baseRevision: 2,
      intent: {
        intentId,
        treeId,
        baseRevision: 2,
        origin: "user-instruction",
        utterance: "change it",
        observedAt: "2026-07-30T00:00:00.000Z",
      },
      proposal: proposal(0.5),
      disposition: {
        kind: "requires-confirmation",
        reason: { code: "confidence-below-minimum", detail: "0.5 is under the floor" },
        stakes: "medium",
        reversible: true,
        confidence: 0.5,
        policyId: "default",
      },
      heldAt: "2026-07-30T00:00:00.000Z",
    },
  },
  {
    kind: "refused",
    proposal: proposal(0.05),
    disposition: {
      kind: "rejected",
      reason: { code: "confidence-below-floor", detail: "far too unsure" },
      stakes: "low",
      reversible: true,
      confidence: 0.05,
      policyId: "default",
    },
  },
  { kind: "not-interpreted", error: { code: "not-understood", detail: "no idea" } },
  {
    kind: "not-applicable",
    proposal: proposal(0.9),
    error: { code: "node-not-found", nodeId: nodeIdSchema.parse("n_9") },
  },
  { kind: "not-written", error: { code: "revision-conflict", treeId, expected: 2, found: 3 } },
  { kind: "not-answerable", error: { code: "not-held", proposalId } },
]

describe("reportOf", () => {
  it("says something for every outcome a write can have", () => {
    for (const outcome of everyOutcome) {
      const report = reportOf(outcome)

      expect(report.headline.length).toBeGreaterThan(0)
      expect(report.detail.length).toBeGreaterThan(0)
    }
  })

  it("covers the whole union", () => {
    expect(new Set(everyOutcome.map((outcome) => outcome.kind)).size).toBe(everyOutcome.length)
  })

  /**
   * "You may not" and "I did not understand" are different answers, and 0019
   * turns on a reviewer being able to tell them apart at a glance.
   */
  it("does not give a refusal and a failed interpretation the same tone", () => {
    const refused = everyOutcome.find((outcome) => outcome.kind === "refused")
    const uninterpreted = everyOutcome.find((outcome) => outcome.kind === "not-interpreted")
    if (!refused || !uninterpreted) throw new Error("expected both outcomes in the sample")

    expect(reportOf(refused).tone).not.toBe(reportOf(uninterpreted).tone)
  })

  /**
   * The three uninterpreted causes share a tone and a headline, because to a
   * reviewer they are the same event: nothing was proposed. What they must not
   * share is the sentence — one clears itself, one needs an operator, and one
   * needs a change to Loom.
   */
  it("distinguishes an outage from a misconfiguration in the detail, not the tone", () => {
    const reports = (
      [
        { code: "interpreter-unavailable", detail: "529 overloaded" },
        { code: "interpreter-misconfigured", detail: "no model is configured" },
        { code: "interpreter-request-rejected", detail: "400 invalid_request_error" },
      ] as const
    ).map((error) => reportOf({ kind: "not-interpreted", error }))

    expect(new Set(reports.map((report) => report.tone))).toEqual(new Set(["uninterpreted"]))
    expect(new Set(reports.map((report) => report.headline))).toEqual(new Set(["not interpreted"]))
    expect(new Set(reports.map((report) => report.detail)).size).toBe(3)
    expect(reports[1]?.detail).toContain("operator")
  })

  it("reports a write as applied only when it reached the log", () => {
    const applied = everyOutcome.filter((outcome) => reportOf(outcome).tone === "applied")

    expect(applied.map((outcome) => outcome.kind)).toEqual(["committed"])
  })

  /** A conflict is the one failure the asker can act on, so it names both revisions. */
  it("carries the revisions through a conflict", () => {
    const conflict = everyOutcome.find((outcome) => outcome.kind === "not-written")
    if (!conflict) throw new Error("expected a conflict in the sample")

    const { detail } = reportOf(conflict)
    expect(detail).toContain("2")
    expect(detail).toContain("3")
  })
})

/**
 * Undo is offered from `/history`, and an undo that would write over later work
 * is held rather than refused (0035) — so this mapping is what tells a reviewer
 * the change is waiting and where to answer it.
 */
describe("revertReportOf", () => {
  const held = everyOutcome.find((outcome) => outcome.kind === "held")
  const committed = everyOutcome.find((outcome) => outcome.kind === "committed")
  if (!held || !committed) throw new Error("expected both outcomes in the sample")

  const unrevertable: RevertOutcome = {
    kind: "not-revertable",
    plan: { outcome: "out-of-range", revision: 7, earliest: 1, headRevision: 3 },
  }

  it("sends a reviewer to the queue when the Gate held the undo", () => {
    const report = revertReportOf(held)

    expect(report.tone).toBe("awaiting")
    expect(report.detail).toContain("review queue")
  })

  it("reads a plan that produced no undo as inapplicable, not as a refusal", () => {
    const report = revertReportOf(unrevertable)

    expect(report.tone).toBe("inapplicable")
    expect(report.headline).toBe("cannot undo")
    expect(report.detail).toContain("7")
  })

  it("says nothing extra about an undo that simply applied", () => {
    expect(revertReportOf(committed)).toEqual(reportOf(committed))
  })
})

describe("toneClasses", () => {
  const everyTone: readonly OutcomeTone[] = [
    "applied",
    "awaiting",
    "rejected",
    "uninterpreted",
    "inapplicable",
  ]

  it("maps every tone to a background and a foreground", () => {
    for (const tone of everyTone) {
      expect(toneClasses(tone).split(" ")).toHaveLength(2)
    }
  })

  it("gives each tone its own classes", () => {
    expect(new Set(everyTone.map(toneClasses)).size).toBe(everyTone.length)
  })
})
