import { describe, expect, it } from "vitest"

import {
  buildElement,
  buildText,
  createTree,
  sequentialIdFactory,
  type LoomTree,
} from "@loom/runtime"

import {
  describeAudit,
  describeDifference,
  describeFacets,
  describeMismatch,
  DIFFERENCE_LIMIT,
} from "./audit-view"

const pageOf = (labels: readonly string[]): LoomTree => {
  const ids = sequentialIdFactory("aud")

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      children: labels.map((label) =>
        buildElement(ids, { type: "loom.prose", children: [buildText(ids, label)] })
      ),
    }),
    ids
  )
}

/** Two trees over one id space, differing by however many leading children. */
const drifted = (count: number) => {
  const stored = pageOf(Array.from({ length: count }, (_, index) => `line ${index}`))

  return { stored, replayed: { ...stored, root: { ...stored.root, children: [] } } }
}

describe("describeAudit", () => {
  it("says the log still produces the tree, and counts what it folded", () => {
    const report = describeAudit({ outcome: "agrees", revision: 4 })

    expect(report.tone).toBe("agrees")
    expect(report.detail).toContain("4 accepted changes")
    expect(report.differences).toEqual([])
    expect(report.omitted).toBe(0)
  })

  it("says one change in the singular, because a report that reads wrong reads as broken", () => {
    expect(describeAudit({ outcome: "agrees", revision: 1 }).detail).toContain("1 accepted change")
    expect(describeAudit({ outcome: "agrees", revision: 1 }).detail).not.toContain("changes")
  })

  it("describes a tree that has never been changed without pretending it was", () => {
    expect(describeAudit({ outcome: "agrees", revision: 0 }).detail).toContain("0 accepted changes")
  })

  it("lists what actually differs when the two disagree", () => {
    const { stored, replayed } = drifted(2)

    const report = describeAudit({ outcome: "diverged", revision: 2, stored, replayed })

    expect(report.tone).toBe("diverged")
    expect(report.differences.map((difference) => difference.code)).toEqual([
      "missing",
      "missing",
      "missing",
      "missing",
    ])
    expect(report.omitted).toBe(0)
  })

  it("caps a long list of differences and says how many it did not show", () => {
    const { stored, replayed } = drifted(DIFFERENCE_LIMIT + 5)

    const report = describeAudit({ outcome: "diverged", revision: 9, stored, replayed })

    expect(report.differences).toHaveLength(DIFFERENCE_LIMIT)
    /** Two nodes per line — the prose element and its text. */
    expect(report.omitted).toBe((DIFFERENCE_LIMIT + 5) * 2 - DIFFERENCE_LIMIT)
  })

  it("reports no differences at all when the two trees are somehow identical", () => {
    const stored = pageOf(["one"])

    const report = describeAudit({ outcome: "diverged", revision: 1, stored, replayed: stored })

    expect(report.tone).toBe("diverged")
    expect(report.differences).toEqual([])
    expect(report.omitted).toBe(0)
  })

  /**
   * An unreplayable log is worse than a divergent one — divergence is two
   * answers and this is none — so the wording must not read as a milder version
   * of the same thing.
   */
  it("says an unreplayable log proves nothing about the served tree", () => {
    const report = describeAudit({
      outcome: "unreplayable",
      mismatch: { code: "revision-gap", expected: 3, found: 7 },
    })

    expect(report.tone).toBe("unreplayable")
    expect(report.detail).toContain("revision 3 was expected next, and 7 was found")
    expect(report.detail).toContain("says nothing about whether the served tree is correct")
    expect(report.differences).toEqual([])
  })
})

describe("describeMismatch", () => {
  it("names the revision whose delta no longer applies", () => {
    expect(describeMismatch({ code: "delta-rejected", revision: 12, detail: "unknown-node" })).toBe(
      "revision 12 no longer applies to the tree the revisions before it produce (unknown-node)"
    )
  })

  it("names both ends of a gap", () => {
    expect(describeMismatch({ code: "revision-gap", expected: 1, found: 4 })).toContain("1")
  })
})

describe("describeDifference", () => {
  it("describes a missing node from the served tree's point of view", () => {
    expect(describeDifference({ code: "missing", nodeId: "n_1" as never, label: "loom.card" })).toBe(
      "in the served tree, but replaying the log does not produce it"
    )
  })

  it("describes an extra node as something only the fold produced", () => {
    expect(describeDifference({ code: "extra", nodeId: "n_1" as never, label: "loom.card" })).toBe(
      "produced by replaying the log, but absent from the served tree"
    )
  })

  it("names every facet a changed node differs on", () => {
    expect(
      describeDifference({
        code: "changed",
        nodeId: "n_1" as never,
        label: "loom.card",
        facets: ["props", "position"],
      })
    ).toBe("differs between the two in its props, where it sits among its siblings")
  })
})

describe("describeFacets", () => {
  it("says every facet in words rather than schema names", () => {
    expect(describeFacets(["kind", "type", "text", "parent"])).toBe(
      "what kind of node it is, which primitive it is, its text, which node it sits inside"
    )
  })
})
