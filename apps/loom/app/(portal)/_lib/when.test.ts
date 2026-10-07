import { describe, expect, it } from "vitest"

import { plainDay, plainMoment } from "./when"

describe("plainMoment", () => {
  it("reads an instant as a date and a time rather than as a machine field", () => {
    expect(plainMoment("2026-07-31T09:04:00.000Z")).toBe("31 July 2026 at 09:04 UTC")
  })

  /** The leading zero is a formatting artefact of the record, not part of the day. */
  it("drops the day's leading zero and keeps the clock's", () => {
    expect(plainMoment("2026-01-05T00:07:00.000Z")).toBe("5 January 2026 at 00:07 UTC")
  })

  /** Milliseconds and seconds are precision nobody reads off a screen. */
  it("says nothing about seconds", () => {
    expect(plainMoment("2026-12-25T23:59:58.123Z")).toBe("25 December 2026 at 23:59 UTC")
  })

  /**
   * The zone is named, never converted. Converting would need the reader's
   * timezone, which a Server Component does not have and which would differ
   * between the server's render and the browser's.
   */
  it("names the zone rather than shifting the time into one", () => {
    expect(plainMoment("2026-07-31T09:04:00.000Z")).toContain("UTC")
    expect(plainMoment("2026-07-31T09:04:00.000Z")).toContain("09:04")
  })

  it("has a name for every month", () => {
    const months = Array.from({ length: 12 }, (_, index) =>
      plainMoment(`2026-${String(index + 1).padStart(2, "0")}-01T00:00:00.000Z`)
    )

    for (const month of months) {
      expect(month, month).not.toContain("undefined")
      expect(month, month).toMatch(/^1 [A-Z][a-z]+ 2026 at 00:00 UTC$/)
    }
    expect(new Set(months).size).toBe(12)
  })

  /**
   * A raw timestamp a reader has to decode is strictly better than a confident
   * `NaN undefined`. The journal validates its timestamps, so this is a branch
   * that should never run — which is exactly why it is worth pinning.
   */
  it("hands back anything it cannot read, rather than inventing a date", () => {
    expect(plainMoment("")).toBe("")
    expect(plainMoment("yesterday")).toBe("yesterday")
    expect(plainMoment("2026-13-01T00:00:00.000Z")).toBe("2026-13-01T00:00:00.000Z")
  })
})

describe("plainDay", () => {
  it("drops the time, because a stretch of days printed to the minute is four numbers to subtract", () => {
    expect(plainDay("2026-10-05T09:04:00.000Z")).toBe("5 October 2026")
  })

  it("reads the same day whatever time of it the record arrived", () => {
    expect(plainDay("2026-10-05T00:00:00.000Z")).toBe(plainDay("2026-10-05T23:59:00.000Z"))
  })

  it("names the same month as the fuller form, for every month", () => {
    for (let month = 1; month <= 12; month += 1) {
      const iso = `2026-${String(month).padStart(2, "0")}-01T00:00:00.000Z`

      expect(plainMoment(iso), iso).toContain(plainDay(iso))
    }
  })

  it("hands back anything it cannot read, rather than inventing a date", () => {
    expect(plainDay("")).toBe("")
    expect(plainDay("2026-13-01T00:00:00.000Z")).toBe("2026-13-01T00:00:00.000Z")
  })
})
