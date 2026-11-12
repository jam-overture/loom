import { describe, expect, it } from "vitest"

import { apiEntries } from "../api/reference"

import { decodeNames, encodeNames } from "./names"

/**
 * The codec on its own, before `build.test.ts` holds the whole names file to
 * it.
 *
 * The file-level tests prove the site's own 2,000-odd names survive the trip.
 * These pin the edges the site's names happen not to reach today — a shared
 * run longer than one digit can say, a list that arrives unsorted, a line that
 * was cut or tampered with — because the day one of them does reach it, the
 * symptom is a search result titled with a name nobody published.
 */
describe("a list of names as one line", () => {
  it("writes each name as what it keeps of the one before and what it adds", () => {
    expect(encodeNames(["policyLogRows", "policyLogOf", "policyLogRow"])).toBe("0policyLogOf 9Row cs")
  })

  it("comes back sorted, whatever order it went in", () => {
    expect(decodeNames(encodeNames(["planReverts", "evaluateGate", "Gate"]))).toEqual([
      "Gate",
      "evaluateGate",
      "planReverts",
    ])
  })

  it("keeps at most 35 characters, and writes out the rest", () => {
    const long = "a".repeat(40)
    const line = encodeNames([long, `${long}b`])

    expect(line).toBe(`0${long} z${"a".repeat(5)}b`)
    expect(decodeNames(line)).toEqual([long, `${long}b`])
  })

  it("carries a name twice when it is listed twice", () => {
    expect(decodeNames(encodeNames(["Gate", "Gate"]))).toEqual(["Gate", "Gate"])
  })

  it("writes nothing for no names, and reads nothing back", () => {
    expect(encodeNames([])).toBe("")
    expect(decodeNames("")).toEqual([])
  })

  it("refuses a name it could not read back", () => {
    expect(() => encodeNames(["two words"])).toThrow(/has a space in it/)
  })

  it("round-trips every name the reference publishes", () => {
    for (const entry of apiEntries) {
      const names = entry.groups.flatMap((group) => group.symbols.map((symbol) => symbol.name))

      expect(decodeNames(encodeNames(names)), entry.specifier).toEqual([...names].sort())
    }
  })
})

describe("a line that is not one encodeNames could write", () => {
  it.each([
    ["a name that keeps more than the one before it has", "0Gate 5s"],
    ["a token with no digit in front", "0Gate Store"],
    ["a first name that claims to keep something", "3Gate"],
    ["an empty token", "0Gate  1ate"],
    ["a token that adds nothing to nothing", "0"],
  ])("is refused whole: %s", (_, line) => {
    expect(decodeNames(line)).toBeUndefined()
  })
})
