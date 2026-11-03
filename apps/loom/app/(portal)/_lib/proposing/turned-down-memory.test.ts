import { describe, expect, it } from "vitest"

import { MAX_REASON_LENGTH, reasonFrom } from "./turned-down"
import { memoryTurnedDownStore } from "./turned-down-memory"
import { describeTurnedDownStoreContract } from "./turned-down.contract"

describeTurnedDownStoreContract("memoryTurnedDownStore", memoryTurnedDownStore)

describe("reasonFrom", () => {
  it("is what was typed, trimmed", () => {
    expect(reasonFrom("  We need the heading.  ")).toBe("We need the heading.")
  })

  it.each([
    ["nothing", null],
    ["blanks", "   "],
    ["a file", new Blob()],
  ])("is no reason for %s", (_name, typed) => {
    expect(reasonFrom(typed)).toBeNull()
  })

  it("is cut to a sentence or two", () => {
    expect(reasonFrom("x".repeat(MAX_REASON_LENGTH + 10))).toHaveLength(MAX_REASON_LENGTH)
  })
})
