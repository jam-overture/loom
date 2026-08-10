import { describe, expect, it } from "vitest"

import { UNATTRIBUTED_POLICY_ID } from "@loom/runtime"
import type { CalibrationScore } from "@loom/runtime/telemetry"

import { describePolicy, formatRange, formatRate, NO_VALUE, readGap } from "./calibration-view"

const scoreWith = (gap: number | null): CalibrationScore => ({
  judged: gap === null ? 0 : 4,
  survived: gap === null ? 0 : 2,
  observedRate: gap === null ? null : 0.5,
  meanConfidence: gap === null ? null : 0.5 + gap,
  gap,
})

describe("formatRate", () => {
  it("shows an absent rate as absent rather than as zero", () => {
    expect(formatRate(null)).toBe(NO_VALUE)
    expect(formatRate(0)).toBe("0%")
  })

  it("renders a rate as whole percent", () => {
    expect(formatRate(0.834)).toBe("83%")
  })
})

describe("formatRange", () => {
  it("marks every band but the last as excluding its upper bound", () => {
    expect(formatRange(0.2, 0.3, false)).toBe("20%–<30%")
  })

  /** The top band is closed, because a confidence of exactly 1 has to live somewhere. */
  it("closes the last band", () => {
    expect(formatRange(0.9, 1, true)).toBe("90%–100%")
  })
})

describe("readGap", () => {
  it("says nothing was judged rather than reporting a perfect score", () => {
    expect(readGap(scoreWith(null)).label).toBe("nothing judged")
  })

  /**
   * The tolerance is what keeps the page from reporting its own sample size.
   * Four claims will not land on the nose and a view that called that
   * overconfidence would be wrong far more often than the model.
   */
  it("treats a small difference as agreement", () => {
    expect(readGap(scoreWith(0.05)).label).toBe("on the mark")
    expect(readGap(scoreWith(-0.05)).label).toBe("on the mark")
  })

  it("distinguishes claiming too much from claiming too little", () => {
    expect(readGap(scoreWith(0.3)).tone).toBe("rejected")
    expect(readGap(scoreWith(-0.3)).tone).toBe("awaiting")
  })
})

describe("describePolicy", () => {
  it("shows a host's own policy name, because that is what it can look up", () => {
    expect(describePolicy("checkout-strict")).toBe("checkout-strict")
  })

  /**
   * Two unknowns and two different next moves: one is answered by widening the
   * window, the other never will be, because the record was written before the
   * Gate wrote down which policy made it.
   */
  it("tells a judgment off the end of the page apart from one that named no policy", () => {
    expect(describePolicy(null)).toBe("judged before this page begins")
    expect(describePolicy(UNATTRIBUTED_POLICY_ID)).toBe("judged before policies were named")
    expect(describePolicy(null)).not.toBe(describePolicy(UNATTRIBUTED_POLICY_ID))
  })
})
