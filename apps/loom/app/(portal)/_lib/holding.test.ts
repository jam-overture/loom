import { describe, expect, it } from "vitest"

import { heldUntilOf, holdingOf, type Withdrawals } from "./holding"

const LIVE = Date.UTC(2026, 10, 14, 9, 0)
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

const NONE: Withdrawals = { newerVersions: [], takenBack: [] }

describe("holdingOf", () => {
  it("holds nobody where no window was chosen, or Off was", () => {
    expect(holdingOf(LIVE, null, NONE)).toEqual({ kind: "none" })
    expect(holdingOf(LIVE, { window: "off", setAt: LIVE - DAY }, NONE)).toEqual({ kind: "none" })
  })

  it("holds returning readers for the window after it went live", () => {
    expect(holdingOf(LIVE, { window: "1d", setAt: LIVE - DAY }, NONE)).toEqual({
      kind: "held",
      window: "1d",
      until: LIVE + DAY,
    })
    expect(holdingOf(LIVE, { window: "1h", setAt: LIVE }, NONE)).toMatchObject({
      until: LIVE + HOUR,
    })
  })

  it("says the window it went live under is not known where it was changed since", () => {
    expect(holdingOf(LIVE, { window: "7d", setAt: LIVE + 1 }, NONE)).toEqual({
      kind: "changed",
      since: LIVE + 1,
    })
    expect(holdingOf(LIVE, { window: "off", setAt: LIVE + HOUR }, NONE)).toEqual({
      kind: "changed",
      since: LIVE + HOUR,
    })
  })

  it("ends the hold at the first newer version or change taken back after it went live", () => {
    const kept = { window: "7d", setAt: LIVE - DAY } as const

    expect(
      holdingOf(LIVE, kept, { newerVersions: [LIVE - HOUR, LIVE + 2 * DAY], takenBack: [] })
    ).toEqual({ kind: "held", window: "7d", until: LIVE + 2 * DAY, endedBy: "newer-version" })
    expect(
      holdingOf(LIVE, kept, { newerVersions: [LIVE + 2 * DAY], takenBack: [LIVE + DAY] })
    ).toEqual({ kind: "held", window: "7d", until: LIVE + DAY, endedBy: "taken-back" })
  })

  it("ignores a withdrawal at or after the window ran out", () => {
    expect(
      holdingOf(
        LIVE,
        { window: "1h", setAt: LIVE - DAY },
        { newerVersions: [LIVE + HOUR], takenBack: [LIVE + DAY] }
      )
    ).toEqual({ kind: "held", window: "1h", until: LIVE + HOUR })
  })
})

describe("heldUntilOf", () => {
  it("is when the hold ended, and nothing where nobody was held", () => {
    expect(heldUntilOf({ kind: "held", window: "1d", until: LIVE + DAY })).toBe(LIVE + DAY)
    expect(heldUntilOf({ kind: "none" })).toBeUndefined()
    expect(heldUntilOf({ kind: "changed", since: LIVE })).toBeUndefined()
  })
})
