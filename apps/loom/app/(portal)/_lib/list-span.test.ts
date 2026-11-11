import { describe, expect, it } from "vitest"

import { positionWords, spanLine, stretchWords } from "./list-span"

const NOW = Date.parse("2026-11-09T09:30:00.000Z")

describe("positionWords", () => {
  it("says which rows of how many, as a person counts them", () => {
    expect(positionWords(1, 50, { count: 4812, more: false })).toBe("1–50 of 4,812")
  })

  it("names one row once", () => {
    expect(positionWords(51, 51, { count: 51, more: false })).toBe("51 of 51")
  })

  it("does not claim an exact total for a read that stopped at its limit", () => {
    expect(positionWords(1, 50, { count: 500, more: true })).toBe("1–50 of 500 or more")
  })
})

describe("stretchWords", () => {
  it("gives the two clock times on one day, and the day once", () => {
    expect(stretchWords("2026-11-09T05:41:12.000Z", "2026-11-09T06:12:59.000Z", NOW)).toBe(
      "05:41 to 06:12 UTC today"
    )
    expect(stretchWords("2026-11-08T05:41:00.000Z", "2026-11-08T06:12:00.000Z", NOW)).toBe(
      "05:41 to 06:12 UTC yesterday"
    )
    expect(stretchWords("2026-11-02T05:41:00.000Z", "2026-11-02T06:12:00.000Z", NOW)).toBe(
      "05:41 to 06:12 UTC on 2 November"
    )
  })

  it("names each day when the page crosses midnight", () => {
    expect(stretchWords("2026-11-07T22:10:00.000Z", "2026-11-09T06:12:00.000Z", NOW)).toBe(
      "7 November 22:10 to today 06:12 UTC"
    )
  })

  it("says one moment once", () => {
    expect(stretchWords("2026-11-09T06:12:00.000Z", "2026-11-09T06:12:40.000Z", NOW)).toBe(
      "at 06:12 UTC today"
    )
  })

  it("gives the year only outside the current one", () => {
    expect(stretchWords("2025-12-30T10:00:00.000Z", "2026-01-02T11:00:00.000Z", NOW)).toBe(
      "30 December 2025 10:00 to 2 January 11:00 UTC"
    )
  })

  it("says nothing rather than guess at a moment it cannot read", () => {
    expect(stretchWords("not a time", "2026-11-09T06:12:00.000Z", NOW)).toBeUndefined()
  })

  it("has no stretch for an empty page", () => {
    expect(stretchWords(undefined, undefined, NOW)).toBeUndefined()
  })

  it("reads a moment kept as milliseconds as it reads one kept as text", () => {
    expect(
      stretchWords(
        Date.parse("2026-11-09T05:41:00.000Z"),
        Date.parse("2026-11-09T06:12:00.000Z"),
        NOW
      )
    ).toBe("05:41 to 06:12 UTC today")
  })
})

describe("spanLine", () => {
  it("joins what the page shows to its stretch of time", () => {
    expect(spanLine("1–50 of 312", "05:41 to 06:12 UTC today")).toBe(
      "1–50 of 312 · 05:41 to 06:12 UTC today"
    )
  })

  it("is what the page shows alone where there is no stretch", () => {
    expect(spanLine("1–50 of 312", undefined)).toBe("1–50 of 312")
  })
})
