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
  type DispositionReasonCode,
  type ProposedChange,
  type StakeFactor,
  type StakeFactorCode,
  type StakeLevel,
  type TreeDelta,
} from "@jam-overture/loom"
import type { RevertOutcome, WriteOutcome } from "@jam-overture/loom/write"

import { reportOf, revertReportOf, toneClasses, type OutcomeTone, type WeighedAgainst } from "./outcome"
import { CANNOT_BE_DRAWN, CHANGE_STATES } from "./vocabulary"

import { runtimeWordsIn } from "../_test/plain-language"

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
      expect(report.meaning.length).toBeGreaterThan(0)
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
   * needs a change to Loom. That sentence is the *technical* half now: the
   * plain half says the same thing for all three, because "the AI did not
   * understand" is true of all three and is what a person needs first.
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
    expect(new Set(reports.map((report) => report.headline))).toEqual(new Set(["Not understood"]))
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
 * Undo is offered from `/portal/history`, and an undo that would write over later work
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
    /*
     * In the sentence a person reads, not in the runtime's own account of the
     * write — "go and answer it over there" is the only thing on this report
     * that tells somebody what to do next, so it cannot be behind a click.
     */
    expect(report.meaning).toContain("review queue")
  })

  it("reads a plan that produced no undo as inapplicable, not as a refusal", () => {
    const report = revertReportOf(unrevertable)

    expect(report.tone).toBe("inapplicable")
    expect(report.headline).toBe("Can't be undone")
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


/**
 * The fourth field, and the distinction it was built to make.
 *
 * Everything above this line is about *what* a write ended as, which is what
 * `reportOf` answered for as long as a card only had to name the state. These are
 * about **why** — the Gate's own factors, which no `WriteOutcome` carries and
 * which reach this module through the lookup `beginWrite` hands over. See
 * `refusal.ts` for the three layers and for the one distinction that earned a
 * plain state of its own.
 */

const factor = (code: StakeFactorCode, level: StakeLevel): StakeFactor => ({
  code,
  level,
  detail: `${code}: what the runtime said about it, at n_9`,
})

/** A lookup that answers for one proposal, which is the thing several of these test. */
const weighing =
  (factors: readonly StakeFactor[], about: string = proposalId): WeighedAgainst =>
  (asked) =>
    asked === about ? factors : []

const refusedFor = (code: DispositionReasonCode): WriteOutcome => ({
  kind: "refused",
  proposal: proposal(0.9),
  disposition: {
    kind: "rejected",
    reason: { code, detail: "the runtime's own joined sentence" },
    stakes: "critical",
    reversible: true,
    confidence: 0.9,
    policyId: "default",
  },
})

describe("what the Gate weighed, as part of the report", () => {
  it("reports why, not only what, on a refusal", () => {
    const report = reportOf(refusedFor("stakes-at-refusal-floor"), weighing([factor("large-removal", "critical")]))

    expect(report.headline).toBe(CHANGE_STATES.refused.label)
    expect(report.reasoning?.ruleCode).toBe("stakes-at-refusal-floor")
    expect(report.reasoning?.objections.map((objection) => objection.code)).toEqual(["large-removal"])
  })

  /**
   * The one behavior this unit was built for. Same kind, same reason code, same
   * everything a `switch` over `WriteOutcome` can see — and a different headline,
   * because what was wrong is different in a way a person has to act on. One sends
   * somebody to `/portal/rules` to loosen a rule; the other tells them their
   * rules are not the problem.
   */
  it("says the change could not be built when that is why it was refused", () => {
    const ordinary = reportOf(refusedFor("stakes-at-refusal-floor"), weighing([factor("large-removal", "critical")]))
    const undrawable = reportOf(
      refusedFor("stakes-at-refusal-floor"),
      weighing([factor("unknown-primitive", "critical")])
    )

    expect(ordinary.headline).toBe(CHANGE_STATES.refused.label)
    expect(undrawable.headline).toBe(CANNOT_BE_DRAWN.label)
    expect(undrawable.meaning).toBe(CANNOT_BE_DRAWN.meaning)
  })

  it("keeps both refusals in one color, so the difference is carried by the words", () => {
    expect(reportOf(refusedFor("stakes-at-refusal-floor"), weighing([factor("unknown-primitive", "critical")])).tone).toBe(
      reportOf(refusedFor("stakes-at-refusal-floor"), weighing([factor("large-removal", "critical")])).tone
    )
  })

  /**
   * Carried on an applied change too, and this is the reading nothing in the
   * portal offered anywhere: what Loom noticed and went ahead with regardless.
   */
  it("reports what was weighed against a change that went ahead", () => {
    const committed = everyOutcome[0]
    const report = reportOf(committed as WriteOutcome, weighing([factor("large-removal", "medium")]))

    expect(report.headline).toBe(CHANGE_STATES.applied.label)
    expect(report.reasoning?.kind).toBe("accepted")
    expect(report.reasoning?.objections.map((objection) => objection.code)).toEqual(["large-removal"])
  })

  it("finds the disposition inside a hold rather than beside it", () => {
    const report = reportOf(everyOutcome[1] as WriteOutcome, weighing([factor("broad-change", "high")]))

    expect(report.reasoning?.kind).toBe("requires-confirmation")
    expect(report.reasoning?.ruleCode).toBe("confidence-below-minimum")
    expect(report.reasoning?.objections.map((objection) => objection.code)).toEqual(["broad-change"])
  })

  /**
   * The four endings that never reached the Gate. A report carrying an empty
   * reason list under them would say the Gate found nothing wrong, which is a
   * different claim from the Gate never having looked — and it is the claim a card
   * would render, because a card cannot tell an absent list from an empty one.
   *
   * `not-applicable` is the interesting one: it names a proposal, so a lookup
   * answers for it, and it still has no disposition because a delta that would not
   * apply was never judged.
   */
  it("has no reasoning on any ending that never reached the Gate", () => {
    const ungated = everyOutcome.filter(
      (outcome) => outcome.kind !== "committed" && outcome.kind !== "held" && outcome.kind !== "refused"
    )

    expect(ungated).toHaveLength(4)

    for (const outcome of ungated) {
      expect(reportOf(outcome, weighing([factor("large-removal", "high")])).reasoning, outcome.kind).toBeUndefined()
    }
  })

  /**
   * The keying. A refusal handed to a repairer produces two assessments in one
   * write (0021), so "the factors" is ambiguous — and the change a person is being
   * told about is the one that was refused, not the smaller one offered instead.
   */
  it("asks about the proposal the outcome names, not whatever was weighed last", () => {
    const report = reportOf(
      refusedFor("stakes-at-refusal-floor"),
      weighing([factor("unknown-primitive", "critical")], "p_the-smaller-one-offered-instead")
    )

    expect(report.reasoning?.objections).toEqual([])
    expect(report.headline).toBe(CHANGE_STATES.refused.label)
  })

  /**
   * Answering a hold is answering a judgement made in a request that has already
   * ended, so this write weighed nothing. The rule still has to be named: an empty
   * list means *nothing to add*, never *nothing was wrong*.
   */
  it("still names the rule when this write weighed nothing", () => {
    const report = reportOf(refusedFor("confidence-below-floor"))

    expect(report.reasoning?.ruleCode).toBe("confidence-below-floor")
    expect(report.reasoning?.rule.length).toBeGreaterThan(0)
    expect(report.reasoning?.objections).toEqual([])
  })

  it("says nothing in the runtime's vocabulary on the surface, on any ending", () => {
    for (const outcome of everyOutcome) {
      const report = reportOf(outcome, weighing([factor("unknown-primitive", "critical")]))
      const surface = [
        report.headline,
        report.meaning,
        report.reasoning?.rule ?? "",
        ...(report.reasoning?.objections ?? []).map((objection) => objection.clause),
      ].join(" ")

      expect(runtimeWordsIn(surface), outcome.kind).toEqual([])
    }
  })

  it("keeps the runtime's own account of each factor, unaltered, for the disclosure", () => {
    const report = reportOf(refusedFor("stakes-at-refusal-floor"), weighing([factor("unknown-primitive", "critical")]))

    expect(report.reasoning?.objections[0]?.detail).toBe(
      "unknown-primitive: what the runtime said about it, at n_9"
    )
  })
})

describe("an undo that ran into the same floor", () => {
  /**
   * The one refusal in this portal a model plays no part in. An undo restores what
   * a change took away, so undoing the removal of a part whose kind this
   * deployment has stopped registering adds a part nothing here can draw — the case
   * 0173 says it refuses on purpose, and the first refusal this lane has managed to
   * photograph.
   */
  it("reads as a change that could not be built, the same as one somebody asked for", () => {
    const report = revertReportOf(
      refusedFor("stakes-at-refusal-floor") as RevertOutcome,
      weighing([factor("unknown-primitive", "critical")])
    )

    expect(report.headline).toBe(CANNOT_BE_DRAWN.label)
    expect(report.reasoning?.objections.map((objection) => objection.code)).toEqual(["unknown-primitive"])
  })

  /**
   * And it credits nobody with having asked. An inverse is computed from the
   * record rather than asked of a model (0007, 0031), so a sentence saying *the AI
   * asked for this* would attribute a request to something that never made one.
   * That wording shipped and was caught in the screenshot rather than here.
   */
  it("does not say a model asked for it", () => {
    const report = revertReportOf(
      refusedFor("stakes-at-refusal-floor") as RevertOutcome,
      weighing([factor("unknown-primitive", "critical")])
    )

    expect(report.meaning).not.toMatch(/\b(AI|model)\b/u)
  })

  it("keeps the reasons on a held undo, beside the pointer to where it is answered", () => {
    const report = revertReportOf(everyOutcome[1] as RevertOutcome, weighing([factor("discards-later-work", "high")]))

    expect(report.meaning).toContain("review queue")
    expect(report.reasoning?.objections.map((objection) => objection.code)).toEqual(["discards-later-work"])
  })
})
