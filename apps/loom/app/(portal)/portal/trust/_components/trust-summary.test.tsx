import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { CALIBRATION_BUCKET_COUNT, type CalibrationReport } from "@loom/runtime/telemetry"

import { TrustSummary } from "./trust-summary"

const buckets = Array.from({ length: CALIBRATION_BUCKET_COUNT }, (_, index) => ({
  lower: index / CALIBRATION_BUCKET_COUNT,
  upper: (index + 1) / CALIBRATION_BUCKET_COUNT,
  judged: 0,
  survived: 0,
  observedRate: null,
  meanConfidence: null,
  gap: null,
}))

const reportWith = (gap: number): CalibrationReport => ({
  overall: {
    judged: 10,
    survived: 6,
    observedRate: 0.6,
    meanConfidence: 0.6 + gap,
    gap,
  },
  buckets,
  byPolicy: [],
  unjudged: { "awaiting-answer": 3, failed: 1, unsettled: 2 },
  runtimeAuthored: 4,
  unattributed: 0,
})

/**
 * The rule this whole surface is built on, asserted rather than trusted:
 * **nothing is removed to make a screen simple.** Every figure the old
 * calibration summary printed is still rendered — the test finds it inside a
 * closed `<details>`, which is exactly where a reader's browser find-in-page
 * finds it too.
 */
describe("TrustSummary", () => {
  it("leads with the verdict and the next move, not with the arithmetic", () => {
    render(<TrustSummary report={reportWith(0.3)} />)

    expect(screen.getByText("The AI has been over-sure of itself")).toBeInstanceOf(HTMLElement)
    expect(screen.getByText(/Read what a change would do before you accept it/)).toBeInstanceOf(
      HTMLElement
    )
  })

  it("says the counts in a sentence a reader does not have to decode", () => {
    render(<TrustSummary report={reportWith(0.3)} />)

    expect(
      screen.getByText("10 changes have been answered. 6 went through. The AI expected about 9.")
    ).toBeInstanceOf(HTMLElement)
  })

  it("keeps every figure the technical summary printed, one click down", () => {
    render(<TrustSummary report={reportWith(0.3)} />)

    const disclosure = screen.getByText("The exact numbers, and what is left out of them")
    expect(disclosure.closest("details")).toBeInstanceOf(HTMLElement)

    for (const term of [
      "judged",
      "survived",
      "mean claim",
      "undos (not scored)",
      "waiting on a human",
      "broke mid-flight",
      "unfinished in this window",
    ]) {
      expect(screen.getByText(term)).toBeInstanceOf(HTMLElement)
    }
  })

  /**
   * The disclosure has to be shut. An open one is the page it replaced, and the
   * test that proves the figures are present would pass either way.
   */
  it("has the technical record closed until somebody asks for it", () => {
    render(<TrustSummary report={reportWith(0.3)} />)

    const details = screen
      .getByText("The exact numbers, and what is left out of them")
      .closest("details")

    expect(details?.hasAttribute("open")).toBe(false)
  })

  it("keeps the technical reading of the gap beside the numbers it explains", () => {
    render(<TrustSummary report={reportWith(0.3)} />)

    expect(screen.getByText("claimed more than it delivered")).toBeInstanceOf(HTMLElement)
  })

  /**
   * The scoreline is the only place the counts appear unasked, so a window with
   * nothing judged must not render one made of zeroes.
   */
  it("shows no scoreline when nothing has been judged", () => {
    render(
      <TrustSummary
        report={{
          ...reportWith(0),
          overall: { judged: 0, survived: 0, observedRate: null, meanConfidence: null, gap: null },
        }}
      />
    )

    expect(screen.getByText("Not enough answers yet")).toBeInstanceOf(HTMLElement)
    expect(screen.queryByText(/have been answered/)).toBeNull()
  })
})
