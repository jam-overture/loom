import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { UNATTRIBUTED_POLICY_ID } from "@loom/runtime"
import {
  CALIBRATION_BUCKET_COUNT,
  type CalibrationReport,
  type CalibrationScore,
  type PolicyCalibration,
} from "@loom/runtime/telemetry"

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

const segment = (
  policyId: string | null,
  judged: number,
  survived: number,
  meanConfidence: number
): PolicyCalibration => ({
  policyId,
  overall: scoreOf(judged, survived, meanConfidence),
  buckets: emptyBuckets,
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
