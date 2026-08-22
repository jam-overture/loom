import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { proposalIdSchema, intentIdSchema, treeIdSchema } from "@loom/runtime"
import { CALIBRATION_BUCKET_COUNT, type ConfidenceBucket } from "@loom/runtime/telemetry"

import type { ContradictedBand, MissCause, MissedClaim, MissGroup } from "@/app/(portal)/_lib/calibration-misses"

import { MissedClaims } from "./missed-claims"

const claim = ({
  id,
  confidence,
  cause,
  rationale = "add a second pricing tier",
  verdict = "rejected",
  detail,
  answeredBy,
  repairOf,
  repairedBy,
}: {
  id: string
  confidence: number
  cause: MissCause
  rationale?: string
  verdict?: MissedClaim["verdict"]
  detail?: string
  answeredBy?: string
  repairOf?: string
  repairedBy?: string
}): MissedClaim => ({
  proposalId: proposalIdSchema.parse(id),
  intentId: intentIdSchema.parse("i_1"),
  treeId: treeIdSchema.parse("t_1"),
  confidence,
  verdict,
  direction: verdict === "survived" ? "underconfident" : "overconfident",
  surprise: verdict === "survived" ? 1 - confidence : confidence,
  cause,
  rationale,
  proposedAt: "2026-08-17T09:30:00.000Z",
  policyId: "portal",
  ...(detail === undefined ? {} : { detail }),
  ...(answeredBy === undefined ? {} : { answeredBy }),
  ...(repairOf === undefined ? {} : { repairOf: proposalIdSchema.parse(repairOf) }),
  ...(repairedBy === undefined ? {} : { repairedBy: proposalIdSchema.parse(repairedBy) }),
})

const group = (cause: MissCause, claims: readonly MissedClaim[]): MissGroup => ({
  cause,
  claims,
  meanConfidence: claims.reduce((sum, one) => sum + one.confidence, 0) / claims.length,
})

const bucket = (lower: number): ConfidenceBucket => ({
  lower,
  upper: lower + 1 / CALIBRATION_BUCKET_COUNT,
  judged: 3,
  survived: 2,
  observedRate: 2 / 3,
  meanConfidence: 0.65,
  gap: 0.65 - 2 / 3,
})

const renderMisses = (
  groups: readonly MissGroup[],
  contradicted: readonly ContradictedBand[] = []
) => {
  const total = groups.reduce((sum, one) => sum + one.claims.length, 0)

  render(<MissedClaims groups={groups} contradicted={contradicted} total={total} />)
}

describe("MissedClaims", () => {
  /**
   * The rationale is the only thing on a row that says what *kind* of change the
   * model was wrong about, which is the whole reason this list beats the rate
   * above it. A row that showed ids and percentages would be a second table.
   */
  it("puts what the change was trying to do on the row", () => {
    renderMisses([
      group("irreversible", [
        claim({ id: "p_1", confidence: 0.94, cause: "irreversible", rationale: "drop the old hero" }),
      ]),
    ])

    expect(screen.getByText("drop the old hero")).toBeTruthy()
  })

  it("says how sure the model was and what became of it", () => {
    renderMisses([group("irreversible", [claim({ id: "p_1", confidence: 0.94, cause: "irreversible" })])])

    expect(screen.getByText(/Said it was 94% sure · turned down/)).toBeTruthy()
    expect(screen.getByText(/94% wide of the mark/)).toBeTruthy()
  })

  /**
   * The ordering is the argument the page is making, so the number behind it is
   * shown rather than left as something a reader has to trust.
   */
  it("shows the underconfident case as its own reading rather than as a refusal", () => {
    renderMisses([
      group("survived-anyway", [
        claim({ id: "p_1", confidence: 0.1, cause: "survived-anyway", verdict: "survived" }),
      ]),
    ])

    expect(screen.getByText(/Said it was 10% sure/)).toBeTruthy()
    expect(screen.getByText(/went through anyway/)).toBeTruthy()
    expect(screen.getByText(/90% wide of the mark/)).toBeTruthy()
  })

  /**
   * A reason code is right on one verdict and useless repeated nine times, so
   * the group heading is a sentence about the model and the code itself does not
   * appear. If it did, the grouping would be a `GROUP BY` with a title.
   */
  it("heads a group with what the model keeps being wrong about", () => {
    renderMisses([
      group("irreversible", [
        claim({ id: "p_1", confidence: 0.9, cause: "irreversible" }),
        claim({ id: "p_2", confidence: 0.8, cause: "irreversible" }),
      ]),
    ])

    expect(screen.getByText("sure about a change that could not be undone")).toBeTruthy()
    expect(screen.getByText(/2× · mean claim 85%/)).toBeTruthy()
  })

  /** 0031 calls the human discard the highest-value signal, so it must not read as a refusal. */
  it("tells a discard apart from a rule the Gate applied", () => {
    renderMisses([
      group("discarded-by-human", [
        claim({ id: "p_1", confidence: 0.9, cause: "discarded-by-human", answeredBy: "jo" }),
      ]),
    ])

    expect(screen.getByText("sure, your rules agreed, and a person said no")).toBeTruthy()
    expect(screen.getByText(/only judgment here made from outside the system/)).toBeTruthy()
    expect(screen.getByText(/answered by jo/)).toBeTruthy()
  })

  it("keeps the Gate's own sentence rather than paraphrasing it", () => {
    renderMisses([
      group("irreversible", [
        claim({
          id: "p_1",
          confidence: 0.9,
          cause: "irreversible",
          detail: "removing 4 nodes cannot be undone from this log",
        }),
      ]),
    ])

    expect(screen.getByText("removing 4 nodes cannot be undone from this log")).toBeTruthy()
  })

  /**
   * A lone refused 0.9 and a refused 0.9 the model was handed back are different
   * stories, and 0006 is the only reason the second one exists.
   */
  it("names a repair in the direction the reader is reading", () => {
    renderMisses([
      group("irreversible", [
        claim({ id: "p_1", confidence: 0.95, cause: "irreversible", repairedBy: "p_2" }),
        claim({ id: "p_2", confidence: 0.9, cause: "irreversible", repairOf: "p_1" }),
      ]),
    ])

    expect(screen.getByText(/handed this back and tried again/)).toBeTruthy()
    expect(screen.getByText(/second attempt, after a refusal/)).toBeTruthy()
  })

  /**
   * The one claim on this page that the table beside it cannot make, so it is
   * asserted rather than left to look right.
   */
  it("warns when a band the table calls settled is holding a miss", () => {
    renderMisses(
      [group("irreversible", [claim({ id: "p_1", confidence: 0.65, cause: "irreversible" })])],
      [{ bucket: bucket(0.6), claims: [claim({ id: "p_1", confidence: 0.65, cause: "irreversible" })] }]
    )

    expect(screen.getByText("The table below looks better than this is")).toBeTruthy()
    expect(screen.getByText(/the 60%–<70% band holds 1 wrong change/)).toBeTruthy()
  })

  it("says nothing about bands when every band agrees with its claims", () => {
    renderMisses([group("irreversible", [claim({ id: "p_1", confidence: 0.9, cause: "irreversible" })])])

    expect(screen.queryByText("The table below looks better than this is")).toBeNull()
  })

  it("counts the claims it is showing", () => {
    renderMisses([
      group("irreversible", [
        claim({ id: "p_1", confidence: 0.9, cause: "irreversible" }),
        claim({ id: "p_2", confidence: 0.8, cause: "irreversible" }),
      ]),
      group("discarded-by-human", [claim({ id: "p_3", confidence: 0.9, cause: "discarded-by-human" })]),
    ])

    expect(screen.getByText(/^3 changes went the opposite way/)).toBeTruthy()
  })

  it("says claim rather than claims when there is one", () => {
    renderMisses([group("irreversible", [claim({ id: "p_1", confidence: 0.9, cause: "irreversible" })])])

    expect(screen.getByText(/^1 change went the opposite way/)).toBeTruthy()
  })
})
