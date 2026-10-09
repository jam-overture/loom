import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { UNATTRIBUTED_POLICY_ID } from "@jam-overture/loom"
import {
  CALIBRATION_BUCKET_COUNT,
  type CalibrationReport,
  type CalibrationScore,
  type PolicyCalibration,
} from "@jam-overture/loom/telemetry"

import { PolicyBreakdown } from "./policy-breakdown"

const scoreOf = (judged: number, survived: number, meanConfidence: number): CalibrationScore => ({
  judged,
  survived,
  observedRate: judged === 0 ? null : survived / judged,
  meanConfidence: judged === 0 ? null : meanConfidence,
  gap: judged === 0 ? null : meanConfidence - survived / judged,
})

const emptyBuckets = Array.from({ length: CALIBRATION_BUCKET_COUNT }, (_, index) => ({
  lower: index / CALIBRATION_BUCKET_COUNT,
  upper: (index + 1) / CALIBRATION_BUCKET_COUNT,
  ...scoreOf(0, 0, 0),
}))

/** Shape halves that match, so two of these differ only in what the policy contained. */
const ONE_RULESET = ["aaaaaaaa:1111111111111111"]
const TWO_RULESETS = ["aaaaaaaa:1111111111111111", "aaaaaaaa:2222222222222222"]
const TWO_SCHEMAS = ["aaaaaaaa:1111111111111111", "bbbbbbbb:2222222222222222"]

const segment = (
  policyId: string | null,
  judged: number,
  survived: number,
  meanConfidence: number,
  rulesets: Partial<Pick<PolicyCalibration, "fingerprints" | "unfingerprinted">> = {}
): PolicyCalibration => ({
  policyId,
  overall: scoreOf(judged, survived, meanConfidence),
  buckets: emptyBuckets,
  fingerprints: ONE_RULESET,
  unfingerprinted: 0,
  checkSets: [[]],
  unrecordedChecks: 0,
  ...rulesets,
})

const reportOf = (byPolicy: readonly PolicyCalibration[]): CalibrationReport => ({
  overall: scoreOf(0, 0, 0),
  buckets: emptyBuckets,
  byPolicy,
  unjudged: { "awaiting-answer": 0, failed: 0, unsettled: 0 },
  unattributed: 0,
  runtimeAuthored: 0,
})

describe("PolicyBreakdown", () => {
  it("renders nothing when one policy judged everything, because it would restate the headline", () => {
    const { container } = render(<PolicyBreakdown report={reportOf([segment("default", 8, 6, 0.8)])} />)

    expect(container.firstChild).toBeNull()
  })

  it("renders nothing when nothing has been judged at all", () => {
    const { container } = render(<PolicyBreakdown report={reportOf([])} />)

    expect(container.firstChild).toBeNull()
  })

  it("gives each gate its own row once two of them judged the same page", () => {
    render(
      <PolicyBreakdown
        report={reportOf([segment("generous", 4, 4, 0.7), segment("strict", 4, 0, 0.9)])}
      />
    )

    expect(screen.getByText("generous")).toBeInstanceOf(HTMLElement)
    expect(screen.getByText("strict")).toBeInstanceOf(HTMLElement)
    expect(screen.getByText("100%")).toBeInstanceOf(HTMLElement)
    expect(screen.getByText("0%")).toBeInstanceOf(HTMLElement)
  })

  /**
   * The reading is per row and not per page. A gate the model read well and one
   * it read badly must not share a verdict, which is the whole reason the split
   * is on the page.
   */
  it("reads each gate on its own numbers rather than on the page's", () => {
    render(
      <PolicyBreakdown
        report={reportOf([segment("generous", 4, 4, 0.7), segment("strict", 4, 0, 0.9)])}
      />
    )

    expect(screen.getByText("delivered more than it claimed")).toBeInstanceOf(HTMLElement)
    expect(screen.getByText("claimed more than it delivered")).toBeInstanceOf(HTMLElement)
  })

  /**
   * Two different unknowns, and a reader's next move differs: one is fixed by a
   * wider window, the other never will be.
   */
  it("tells a judgment this page never saw apart from one that never named its policy", () => {
    render(
      <PolicyBreakdown
        report={reportOf([
          segment(UNATTRIBUTED_POLICY_ID, 2, 1, 0.6),
          segment(null, 3, 2, 0.7),
        ])}
      />
    )

    expect(screen.getByText("judged before policies were named")).toBeInstanceOf(HTMLElement)
    expect(screen.getByText("judged before this page begins")).toBeInstanceOf(HTMLElement)
  })

  it("keeps the segments in the order the report put them in", () => {
    render(
      <PolicyBreakdown
        report={reportOf([segment("generous", 1, 1, 0.9), segment("strict", 1, 0, 0.9), segment(null, 1, 1, 0.9)])}
      />
    )

    const names = Array.from(document.querySelectorAll("tbody tr td:first-child")).map(
      (cell) => cell.textContent
    )

    expect(names).toEqual(["generous", "strict", "judged before this page begins"])
  })
})

/**
 * A name is host-declared, so "one policy judged this page" is only as good as
 * the host's discipline about renaming what it edits (0033). When that slipped,
 * the page has one row and two gates — and staying silent would be the same
 * pooling error the breakdown exists to correct.
 */
describe("PolicyBreakdown, when a policy did not hold still", () => {
  it("appears for a single segment whose rules changed, where it would otherwise stay hidden", () => {
    render(
      <PolicyBreakdown
        report={reportOf([segment("checkout", 6, 3, 0.8, { fingerprints: TWO_RULESETS })])}
      />
    )

    expect(screen.getByText("the rules changed under this name")).toBeInstanceOf(HTMLElement)
    expect(screen.getByText(/did not hold still/)).toBeInstanceOf(HTMLElement)
  })

  it("says which name stopped meaning one thing", () => {
    render(
      <PolicyBreakdown
        report={reportOf([
          segment("checkout", 6, 3, 0.8, { fingerprints: TWO_RULESETS }),
          segment("marketing", 4, 4, 0.7),
        ])}
      />
    )

    expect(screen.getByText(/2 different rulesets .* "checkout"/)).toBeInstanceOf(HTMLElement)
  })

  /** An upgrade that changed which knobs exist is not evidence that anyone edited one. */
  it("does not call a change of Loom version a change of policy", () => {
    render(
      <PolicyBreakdown
        report={reportOf([segment("checkout", 6, 3, 0.8, { fingerprints: TWO_SCHEMAS })])}
      />
    )

    expect(screen.getByText("judged under different versions of the policy")).toBeInstanceOf(
      HTMLElement
    )
    expect(screen.queryByText("the rules changed under this name")).toBeNull()
  })

  it("stays quiet on a row that named one ruleset and recorded all of it", () => {
    render(
      <PolicyBreakdown
        report={reportOf([segment("generous", 4, 4, 0.7), segment("strict", 4, 0, 0.9)])}
      />
    )

    expect(document.querySelectorAll("tbody tr")).toHaveLength(2)
  })

  it("says a row is only partly recorded rather than letting it read as settled", () => {
    render(
      <PolicyBreakdown
        report={reportOf([
          segment("generous", 4, 4, 0.7, { unfingerprinted: 3 }),
          segment("strict", 4, 0, 0.9),
        ])}
      />
    )

    expect(screen.getByText("partly recorded")).toBeInstanceOf(HTMLElement)
    expect(screen.getByText(/3 of them were judged before rulesets were recorded/)).toBeInstanceOf(
      HTMLElement
    )
  })
})
