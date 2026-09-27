import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { proposalIdSchema, intentIdSchema, treeIdSchema } from "@jam-overture/loom"
import { CALIBRATION_BUCKET_COUNT, type ConfidenceBucket } from "@jam-overture/loom/telemetry"

import type { ContradictedBand, MissCause, MissedClaim, MissGroup } from "@/app/(portal)/_lib/calibration-misses"
import type { PageName } from "@/app/(portal)/_lib/page-name"

import { MissedClaims } from "./missed-claims"

const named = (treeId: string, name: string): PageName => ({ name, treeId, derived: true })

const claim = ({
  id,
  confidence,
  cause,
  treeId = "t_1",
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
  treeId?: string
  rationale?: string
  verdict?: MissedClaim["verdict"]
  detail?: string
  answeredBy?: string
  repairOf?: string
  repairedBy?: string
}): MissedClaim => ({
  proposalId: proposalIdSchema.parse(id),
  intentId: intentIdSchema.parse("i_1"),
  treeId: treeIdSchema.parse(treeId),
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
  contradicted: readonly ContradictedBand[] = [],
  names?: ReadonlyMap<string, PageName>
) => {
  const total = groups.reduce((sum, one) => sum + one.claims.length, 0)

  render(
    <MissedClaims
      groups={groups}
      contradicted={contradicted}
      total={total}
      {...(names === undefined ? {} : { names })}
    />
  )
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


  /**
   * The fact `MissedClaim` has carried since it was written and this screen had
   * never rendered. Six wrong claims about one page and six about six pages want
   * opposite next moves, and the screen looked identical either way.
   */
  it("says which page a wrong claim was made about", () => {
    renderMisses(
      [group("irreversible", [claim({ id: "p_1", confidence: 0.9, cause: "irreversible", treeId: "t_pricing" })])],
      [],
      new Map([["t_pricing", named("t_pricing", "Autumn prices")]])
    )

    expect(screen.getByText("Autumn prices")).toBeTruthy()
    /*
     * Twice, and both are right: beside the name on the surface, because identity
     * is not technical detail, and again in the record, because that is where
     * something else is matched against it.
     */
    expect(screen.getAllByText("t_pricing")).toHaveLength(2)
  })

  /**
   * The page names the page and does not offer to go there, which is a decision a
   * screenshot made: a bare link in this portal is drawn as plain text, and a
   * repeated inline link on every row of a group is three presses to one
   * destination. `WrongPages` is that destination, once per page.
   */
  it("names the page without making the row a second way to the same place", () => {
    renderMisses(
      [group("irreversible", [claim({ id: "p_1", confidence: 0.9, cause: "irreversible", treeId: "t_pricing" })])],
      [],
      new Map([["t_pricing", named("t_pricing", "Autumn prices")]])
    )

    expect(screen.queryByRole("link")).toBeNull()
  })

  /**
   * A page the store would not name is still named — untitled, beside the id it
   * was asked about. `namesOf` answers for every id, so a failed read costs the
   * words and never the row.
   */
  it("still names a page the store could not read", () => {
    renderMisses(
      [group("irreversible", [claim({ id: "p_1", confidence: 0.9, cause: "irreversible", treeId: "t_gone" })])],
      [],
      new Map()
    )

    expect(screen.getByText("Untitled page")).toBeTruthy()
    expect(screen.getAllByText("t_gone")).toHaveLength(2)
  })

  /**
   * On a screen already scoped to one page every row would name the same page,
   * competing with the sentence the row exists to show. The id is one click down
   * either way, which keeps this a layout decision rather than a dropped fact.
   */
  it("leaves the page off the row when the screen is already about one page", () => {
    renderMisses([
      group("irreversible", [claim({ id: "p_1", confidence: 0.9, cause: "irreversible", treeId: "t_pricing" })]),
    ])

    expect(screen.getAllByText("t_pricing")).toHaveLength(1)
  })

  /**
   * The other half of the governing principle, in the direction this row had
   * backwards: every id the claim carries is reachable, and none of it is on the
   * surface. `/portal/activity` is found by id, so a row that dropped them was
   * the one screen naming a change nobody could then go and read.
   */
  it("keeps every id the record holds, one click down", () => {
    renderMisses([
      group("irreversible", [
        claim({ id: "p_1", confidence: 0.9, cause: "irreversible", treeId: "t_pricing", repairedBy: "p_2" }),
      ]),
    ])

    const record = screen.getByText("What the record says about this one").closest("details")!

    expect(record.textContent).toContain("p_1")
    expect(record.textContent).toContain("i_1")
    expect(record.textContent).toContain("t_pricing")
    expect(record.textContent).toContain("irreversible")
    expect(record.textContent).toContain("0.90")
    expect(record.textContent).toContain("p_2")
  })

  /**
   * The Gate's own sentence carries node ids and the value a schema turned down.
   * It was on the surface in italics, which is the technical record out in front
   * of the plain one — the inversion the whole redirection turns on.
   */
  it("puts the Gate's own sentence under the disclosure and not on the row", () => {
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

    const record = screen.getByText("What the record says about this one").closest("details")!

    expect(record.textContent).toContain("removing 4 nodes cannot be undone from this log")
  })

  it("says claim rather than claims when there is one", () => {
    renderMisses([group("irreversible", [claim({ id: "p_1", confidence: 0.9, cause: "irreversible" })])])

    expect(screen.getByText(/^1 change went the opposite way/)).toBeTruthy()
  })
})
