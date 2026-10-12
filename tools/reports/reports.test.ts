import { describe, expect, it } from "vitest"

import {
  faultsIn,
  LONGEST_WEBP_SIDE,
  MOST_ONE_VISUAL_WEIGHS,
  storedSize,
  uncitedIn,
  type Survey,
} from "./visuals.js"

/**
 * The rule is a pure function of a survey, which is the whole reason the survey
 * is a value: every case below is a repository state that would otherwise take
 * a fixture directory to express, and two of them are states this repository
 * was actually in when the check was written.
 */

const surveyOf = (
  visuals: readonly { file: string; bytes: number }[],
  mentioned: readonly string[] = []
): Survey => ({ visuals, mentioned: new Set(mentioned) })

describe("what a visual may be", () => {
  it("passes a webp inside budget", () => {
    const survey = surveyOf([{ file: "reports/a.webp", bytes: 54_000 }], ["a.webp"])
    expect(faultsIn(survey)).toEqual([])
  })

  it("refuses a png, which is what 1662 of them were", () => {
    const faults = faultsIn(surveyOf([{ file: "reports/a.png", bytes: 1_000 }], ["a.png"]))
    expect(faults).toEqual([{ code: "unstored-format", file: "reports/a.png" }])
  })

  it("allows svg, because a diagram is already cheap", () => {
    expect(faultsIn(surveyOf([{ file: "reports/a.svg", bytes: 6_000 }], ["a.svg"]))).toEqual([])
  })

  it("refuses a visual over budget even in the stored format", () => {
    const bytes = MOST_ONE_VISUAL_WEIGHS + 1
    const faults = faultsIn(surveyOf([{ file: "reports/big.webp", bytes }], ["big.webp"]))
    expect(faults).toEqual([{ code: "over-budget", file: "reports/big.webp", bytes }])
  })

  it("lets a visual exactly at the budget through", () => {
    const at = surveyOf([{ file: "reports/a.webp", bytes: MOST_ONE_VISUAL_WEIGHS }], ["a.webp"])
    expect(faultsIn(at)).toEqual([])
  })

  it("reports both faults for one file rather than stopping at the first", () => {
    const bytes = MOST_ONE_VISUAL_WEIGHS + 1
    const codes = faultsIn(surveyOf([{ file: "reports/a.png", bytes }], ["a.png"])).map((f) => f.code)
    expect(codes).toEqual(["unstored-format", "over-budget"])
  })

  it("orders by file so two runs are comparable", () => {
    const survey = surveyOf(
      [
        { file: "reports/z.png", bytes: 1 },
        { file: "reports/a.png", bytes: 1 },
      ],
      ["z.png", "a.png"]
    )
    expect(faultsIn(survey).map((fault) => fault.file)).toEqual(["reports/a.png", "reports/z.png"])
  })
})

describe("a visual nothing cites", () => {
  /**
   * The case that nearly cost this repository 139MB of evidence: the first
   * draft made this a fault, and the fix for a fault is `rm`.
   */
  it("is not a fault, because a citation cannot be inferred", () => {
    const survey = surveyOf([{ file: "reports/lonely.webp", bytes: 10 }], [])
    expect(faultsIn(survey)).toEqual([])
  })

  it("is reported as a count instead", () => {
    const survey = surveyOf(
      [
        { file: "reports/cited.webp", bytes: 10 },
        { file: "reports/lonely.webp", bytes: 10 },
      ],
      ["cited.webp"]
    )
    expect(uncitedIn(survey)).toEqual(["reports/lonely.webp"])
  })

  it("counts a mention anywhere, not only a markdown image", () => {
    const survey = surveyOf([{ file: "reports/shot.webp", bytes: 10 }], ["shot.webp"])
    expect(uncitedIn(survey)).toEqual([])
  })
})

describe("the size a capture is stored at", () => {
  it("is the size the page was laid out at", () => {
    expect(storedSize({ width: 2560, height: 1800, scale: 2 })).toEqual({
      width: 1280,
      height: 900,
    })
  })

  it("leaves a capture taken at 1 alone", () => {
    expect(storedSize({ width: 1280, height: 900, scale: 1 })).toEqual({
      width: 1280,
      height: 900,
    })
  })

  /**
   * `2026-09-06-marketing-four-units-record.png` is 2560x30484. Halved it is
   * 15242 tall, which fits; the case below is the one that does not, and the
   * encoder refuses rather than truncates, so the harness has to.
   */
  it("fits a page too long for the encoder, proportionally", () => {
    const stored = storedSize({ width: 2560, height: 80_000, scale: 2 })
    expect(stored.height).toBe(LONGEST_WEBP_SIDE)
    // Proportional rather than cropped: within the pixel that flooring costs.
    expect(stored.width).toBe(Math.floor(1280 * (LONGEST_WEBP_SIDE / 40_000)))
    expect(Math.abs(stored.width - (stored.height * 1280) / 40_000)).toBeLessThan(1)
  })

  it("keeps the longest page this repository has photographed intact", () => {
    expect(storedSize({ width: 2560, height: 30_484, scale: 2 })).toEqual({
      width: 1280,
      height: 15_242,
    })
  })

  it("never rounds a thin strip away to nothing", () => {
    expect(storedSize({ width: 3, height: 1200, scale: 4 })).toEqual({ width: 1, height: 300 })
  })
})
