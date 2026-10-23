import { describe, expect, it } from "vitest"

import { describeRatioAbsence, ratioOf, RATIO_ABSENCES, type Ratio } from "./ratios.js"

const given = (was: number | null | undefined, now: number | null | undefined): Ratio =>
  ratioOf(was, now)

describe("ratioOf", () => {
  it("divides the later window's figure by the earlier one's", () => {
    expect(given(0.2, 0.5)).toEqual({ ratio: 2.5, absent: null })
  })

  it("names a nought on the earlier side rather than dividing by it", () => {
    expect(given(0, 0.4)).toEqual({ ratio: null, absent: "from-nothing" })
  })

  it("publishes a nought on the later side, because it is a measurement", () => {
    expect(given(0.4, 0)).toEqual({ ratio: 0, absent: null })
  })

  it("calls a nought on both sides a nought on the earlier side", () => {
    expect(given(0, 0)).toEqual({ ratio: null, absent: "from-nothing" })
  })

  it.each([
    ["the earlier side is undefined", undefined, 0.5],
    ["the later side is undefined", 0.2, undefined],
    ["the earlier side is null", null, 0.5],
    ["the later side is null", 0.2, null],
    ["neither side has a figure", null, undefined],
  ])("says nothing was measured where %s", (_name, was, now) => {
    expect(given(was, now)).toEqual({ ratio: null, absent: "unmeasured" })
  })

  it("prefers the absence of a figure to a nought, where one side has neither", () => {
    expect(given(undefined, 0.5).absent).toBe("unmeasured")
    expect(given(0, undefined).absent).toBe("unmeasured")
  })

  it.each([
    ["a quotient", 0.2, 0.5],
    ["a nought on the earlier side", 0, 0.5],
    ["a nought on the later side", 0.5, 0],
    ["no figure on the earlier side", undefined, 0.5],
    ["no figure on the later side", 0.5, null],
  ])("holds exactly one of the two fields, given %s", (_name, was, now) => {
    const ratio = given(was, now)

    expect(ratio.ratio === null).toBe(ratio.absent !== null)
  })
})

describe("what a surface draws the absence as", () => {
  it("has a line for every member of the closed set", () => {
    expect(RATIO_ABSENCES.map(describeRatioAbsence).every((line) => line.length > 0)).toBe(true)
  })

  it("gives the two states two different lines", () => {
    expect(describeRatioAbsence("unmeasured")).not.toBe(describeRatioAbsence("from-nothing"))
  })

  it("names both states and nothing else", () => {
    expect([...RATIO_ABSENCES].sort()).toEqual(["from-nothing", "unmeasured"])
  })
})
