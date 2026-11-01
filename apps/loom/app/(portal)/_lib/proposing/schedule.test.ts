import { describe, expect, it } from "vitest"

import { MINIMUM_CRON_SECRET_LENGTH, scheduleCheck } from "./schedule"

const SECRET = "c".repeat(32)

describe("scheduleCheck", () => {
  it("lets in the scheduler, which sends the secret as a bearer token", () => {
    expect(scheduleCheck(`Bearer ${SECRET}`, SECRET)).toBe("allowed")
  })

  it.each([
    ["no header", null],
    ["the wrong secret", `Bearer ${"d".repeat(32)}`],
    ["the secret without Bearer", SECRET],
    ["a longer header", `Bearer ${SECRET}x`],
  ])("refuses %s", (_name, header) => {
    expect(scheduleCheck(header, SECRET)).toBe("refused")
  })

  it("starts nothing on a deployment without a long enough secret", () => {
    expect(scheduleCheck(`Bearer ${SECRET}`, undefined)).toBe("unconfigured")
    expect(scheduleCheck("Bearer short", "short")).toBe("unconfigured")
    expect(MINIMUM_CRON_SECRET_LENGTH).toBeGreaterThan("short".length)
  })
})
