import { describe, expect, it } from "vitest"

import { runtimeWordsIn } from "../../_test/plain-language"
import {
  segmentAcceptedReport,
  segmentAnswerFor,
  segmentNotOfferedOf,
  segmentOfAnswer,
  segmentRefusalOf,
} from "./segment-answer"
import { segmentChange } from "./segment-fixtures"
import type { SegmentFormsError } from "./segment-forms"

const EVERY_ERROR: readonly SegmentFormsError[] = [
  { code: "full" },
  { code: "does-not-fit" },
  { code: "answered" },
  { code: "store", detail: "connection refused" },
]

describe("what Accept for one segment only says", () => {
  it("carries its segment in the answer, and reads it back from that answer only", () => {
    expect(segmentOfAnswer(segmentAnswerFor("phone"))).toBe("phone")
    expect(segmentOfAnswer("accept")).toBeUndefined()
    expect(segmentOfAnswer("refuse")).toBeUndefined()
    expect(segmentOfAnswer(null)).toBeUndefined()
  })

  it("says why it was not accepted in plain words, naming the segment where it matters", () => {
    expect(segmentRefusalOf({ code: "does-not-fit" }, "phone")).toMatch(/phone/u)
    expect(segmentRefusalOf({ code: "store", detail: "down" }, "phone")).toMatch(/phone/u)
    expect(segmentNotOfferedOf("phone")).toMatch(/no reader in phone/u)

    for (const error of EVERY_ERROR) {
      expect(runtimeWordsIn(segmentRefusalOf(error, "phone"))).toEqual([])
    }
  })

  it("says who gets the change and that everyone else keeps the page, with the record one click down", () => {
    const report = segmentAcceptedReport(segmentChange(1), "phone")

    expect(report).toMatchObject({ tone: "applied", headline: "Accepted for phone only" })
    expect(report.meaning).toMatch(/sorts into phone .* Everyone else keeps the page as it is/u)
    expect(report.detail).toMatch(/p_1: 1 operation on aud_phone's form of/u)
    expect(runtimeWordsIn(report.meaning)).toEqual([])
  })
})
