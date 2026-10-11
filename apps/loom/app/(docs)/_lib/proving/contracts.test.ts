import { describe, expect, it } from "vitest"

import { CONTRACTS_SPECIFIER, contractSuites } from "./contracts"

/**
 * The table on *Testing what you built* is read off the generated reference, so
 * what is worth holding is the reading rather than the list.
 *
 * Three ways it could go wrong quietly: the door stops publishing a suite and
 * the table silently loses a row; a contract module's opening sentence is
 * reworded and the seam column empties; the signature grows a prefix and the
 * call column starts repeating the name. The first is what the count test is
 * for, and the other two refuse rather than render.
 */

describe("the contract suites", () => {
  it("finds the ones the door publishes", () => {
    const names = contractSuites().map((suite) => suite.name)

    expect(names).toContain("describeTreeStoreContract")
    expect(names).toContain("describeHoldStoreContract")
    expect(names).toContain("describeTelemetryJournalContract")
    expect(names).toContain("describePolicyLogContract")
    expect(names).toContain("describeModelClientContract")
  })

  it("finds nothing that is not a suite", () => {
    for (const suite of contractSuites()) {
      expect(suite.name.startsWith("describe"), suite.name).toBe(true)
      expect(suite.name.endsWith("Contract"), suite.name).toBe(true)
    }
  })

  it("names the seam each one holds", () => {
    const seams = new Map(contractSuites().map((suite) => [suite.name, suite.seam]))

    expect(seams.get("describeTreeStoreContract")).toBe("TreeStore")
    expect(seams.get("describeModelClientContract")).toBe("ModelClient")
  })

  it("gives the call without the name in front of it", () => {
    for (const suite of contractSuites()) {
      expect(suite.call.startsWith("("), suite.name).toBe(true)
      expect(suite.call).not.toContain(`const ${suite.name}`)
    }
  })

  it("says the name of the only door it reads", () => {
    expect(CONTRACTS_SPECIFIER).toBe("@jam-overture/loom/testing/contracts")
  })

  it("puts them in a knowable order", () => {
    const seams = contractSuites().map((suite) => suite.seam)

    expect(seams).toEqual([...seams].sort((left, right) => left.localeCompare(right)))
  })
})
