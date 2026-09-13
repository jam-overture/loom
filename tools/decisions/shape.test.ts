import { describe, expect, it } from "vitest"

import { checkShape, describeShapeProblem, REQUIRED_SECTIONS } from "./shape.js"

const record = (sections: readonly string[]) =>
  `# 0201. A decision\n\n**Status:** Accepted\n\n${sections.map((section) => `## ${section}\n\nprose\n`).join("\n")}`

const whole = record([...REQUIRED_SECTIONS])

const NO_EXEMPTIONS = new Map<string, readonly []>()

describe("checkShape", () => {
  it("is quiet about a record carrying all four sections", () => {
    expect(checkShape("0201-a.md", whole, NO_EXEMPTIONS)).toEqual([])
  })

  it("reports the section whose absence a reader cannot reconstruct", () => {
    const without = record(["Context", "Decision", "Consequences"])

    expect(checkShape("0201-a.md", without, NO_EXEMPTIONS)).toEqual([
      { code: "missing-section", file: "0201-a.md", section: "Alternatives considered" },
    ])
  })

  it("reports each missing section separately, in the order they are written", () => {
    expect(checkShape("0201-a.md", record(["Consequences"]), NO_EXEMPTIONS)).toEqual([
      { code: "missing-section", file: "0201-a.md", section: "Context" },
      { code: "missing-section", file: "0201-a.md", section: "Decision" },
      { code: "missing-section", file: "0201-a.md", section: "Alternatives considered" },
    ])
  })

  /** 0014 writes `## Decision (proposed)`, which is honest rather than malformed. */
  it("accepts a heading with a qualifier after it", () => {
    const qualified = record(["Context", "Consequences", "Alternatives considered"]).replace(
      "## Context",
      "## Decision (proposed)\n\nprose\n\n## Context"
    )

    expect(checkShape("0201-a.md", qualified, NO_EXEMPTIONS)).toEqual([])
  })

  it("does not accept a section named inside a paragraph as the section itself", () => {
    const mentioned = record(["Context", "Decision", "Consequences"]).replace(
      "prose",
      "the Alternatives considered section is where this would go"
    )

    expect(checkShape("0201-a.md", mentioned, NO_EXEMPTIONS)).toHaveLength(1)
  })

  /**
   * 0081 is the whole exemption list. Backfilling it would mean writing down
   * alternatives nobody weighed and presenting them as the ones that were.
   */
  it("excuses a record that is on the list", () => {
    const without = record(["Context", "Decision", "Consequences"])
    const excused = new Map([["0201-a.md", ["Alternatives considered"] as const]])

    expect(checkShape("0201-a.md", without, excused)).toEqual([])
  })

  it("excuses only the section named", () => {
    const without = record(["Context", "Decision"])
    const excused = new Map([["0201-a.md", ["Alternatives considered"] as const]])

    expect(checkShape("0201-a.md", without, excused)).toEqual([
      { code: "missing-section", file: "0201-a.md", section: "Consequences" },
    ])
  })

  it("excuses only the record named", () => {
    const without = record(["Context", "Decision", "Consequences"])
    const excused = new Map([["0081-another.md", ["Alternatives considered"] as const]])

    expect(checkShape("0201-a.md", without, excused)).toEqual([
      { code: "missing-section", file: "0201-a.md", section: "Alternatives considered" },
    ])
  })

  /** An exemption that outlives its reason is the way a list like this rots. */
  it("reports an exemption the record no longer needs", () => {
    const excused = new Map([["0201-a.md", ["Alternatives considered"] as const]])

    expect(checkShape("0201-a.md", whole, excused)).toEqual([
      { code: "needless-exemption", file: "0201-a.md", section: "Alternatives considered" },
    ])
  })
})

describe("describeShapeProblem", () => {
  it("names the heading a reader would add", () => {
    expect(
      describeShapeProblem({
        code: "missing-section",
        file: "0201-a.md",
        section: "Alternatives considered",
      })
    ).toBe('0201-a.md has no "## Alternatives considered" section')
  })

  it("says where a stale exemption is written down", () => {
    expect(
      describeShapeProblem({
        code: "needless-exemption",
        file: "0201-a.md",
        section: "Alternatives considered",
      })
    ).toBe('0201-a.md now has "## Alternatives considered", so its exemption in shape.ts can go')
  })
})
