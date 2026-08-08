import { describe, expect, it } from "vitest"

import {
  buildElement,
  buildText,
  createTree,
  sequentialIdFactory,
  type IdReturn,
  type LoomTree,
  type NodeId,
} from "@loom/runtime"

import {
  describeAudit,
  describeDifference,
  describeFacets,
  describeMismatch,
  describeRecycling,
  stoppedAt,
  type RecyclingAccount,
  DIFFERENCE_LIMIT,
  RECYCLING_LIMIT,
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
    const report = describeAudit({ outcome: "agrees", revision: 4, idReturns: [] })

    expect(report.tone).toBe("agrees")
    expect(report.detail).toContain("4 accepted changes")
    expect(report.differences).toEqual([])
    expect(report.omitted).toBe(0)
  })

  it("says one change in the singular, because a report that reads wrong reads as broken", () => {
    expect(describeAudit({ outcome: "agrees", revision: 1, idReturns: [] }).detail).toContain("1 accepted change")
    expect(describeAudit({ outcome: "agrees", revision: 1, idReturns: [] }).detail).not.toContain("changes")
  })

  it("describes a tree that has never been changed without pretending it was", () => {
    expect(describeAudit({ outcome: "agrees", revision: 0, idReturns: [] }).detail).toContain("0 accepted changes")
  })

  it("lists what actually differs when the two disagree", () => {
    const { stored, replayed } = drifted(2)

    const report = describeAudit({ outcome: "diverged", revision: 2, stored, replayed, idReturns: [] })

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

    const report = describeAudit({ outcome: "diverged", revision: 9, stored, replayed, idReturns: [] })

    expect(report.differences).toHaveLength(DIFFERENCE_LIMIT)
    /** Two nodes per line — the prose element and its text. */
    expect(report.omitted).toBe((DIFFERENCE_LIMIT + 5) * 2 - DIFFERENCE_LIMIT)
  })

  it("reports no differences at all when the two trees are somehow identical", () => {
    const stored = pageOf(["one"])

    const report = describeAudit({ outcome: "diverged", revision: 1, stored, replayed: stored, idReturns: [] })

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

const recyclingOf = (nodeId: string, returnedAt: number): IdReturn => ({
  code: "recycled",
  nodeId: nodeId as NodeId,
  leftAs: "loom.card",
  returnedAs: "text",
  leftAt: 1,
  returnedAt,
})

const restorationOf = (nodeId: string): IdReturn => ({
  code: "restored",
  nodeId: nodeId as NodeId,
  label: "loom.card",
  leftAt: 1,
  returnedAt: 2,
})

/**
 * Recycling is a second finding rather than a second verdict (0038): the log can
 * still produce the snapshot while an id has stopped naming one node, and a page
 * that folded the two together would have to call one of them by the other's
 * name.
 */
describe("describeAudit and id identity", () => {
  it("reports a recycled id under a verdict that still agrees", () => {
    const report = describeAudit({
      outcome: "agrees",
      revision: 4,
      idReturns: [recyclingOf("n_4", 3)],
    })

    expect(report.tone).toBe("agrees")
    expect(report.recycled).toHaveLength(1)
    expect(report.restored).toBe(0)
  })

  it("counts a restoration rather than listing it beside a fault", () => {
    const report = describeAudit({
      outcome: "agrees",
      revision: 4,
      idReturns: [restorationOf("n_4"), restorationOf("n_5")],
    })

    expect(report.recycled).toEqual([])
    expect(report.restored).toBe(2)
  })

  it("reports recycled ids on a diverged tree as well", () => {
    const { stored, replayed } = drifted(1)

    const report = describeAudit({
      outcome: "diverged",
      revision: 3,
      stored,
      replayed,
      idReturns: [recyclingOf("n_4", 3)],
    })

    expect(report.tone).toBe("diverged")
    expect(report.recycled).toHaveLength(1)
  })

  it("caps a long list of recycled ids and says how many it did not show", () => {
    const idReturns = Array.from({ length: RECYCLING_LIMIT + 3 }, (_, index) =>
      recyclingOf(`n_${index}`, index + 2)
    )

    const report = describeAudit({ outcome: "agrees", revision: 20, idReturns })

    expect(report.recycled).toHaveLength(RECYCLING_LIMIT)
    expect(report.recyclingOmitted).toBe(3)
  })

  /** A fold that stopped saw part of the log, and part of a history is not one. */
  it("claims nothing about ids when the log could not be replayed", () => {
    const report = describeAudit({
      outcome: "unreplayable",
      mismatch: { code: "revision-gap", expected: 3, found: 7 },
    })

    expect(report.recycled).toEqual([])
    expect(report.recyclingOmitted).toBe(0)
    expect(report.restored).toBe(0)
  })

  /**
   * The one place an unreplayable verdict can send anybody. Everything else it
   * says is about what could not be established.
   */
  it("names the revision the fold stopped at, and only when it stopped", () => {
    const stopped = describeAudit({
      outcome: "unreplayable",
      mismatch: { code: "revision-gap", expected: 3, found: 7 },
    })

    expect(stopped.stoppedAt).toBe(7)
    expect(describeAudit({ outcome: "agrees", revision: 2, idReturns: [] }).stoppedAt).toBeNull()
  })
})

/** The parts as JSX joins them, with each revision put back where it belongs. */
const joinRecycling = (account: RecyclingAccount): string =>
  `${account.opening} revision ${account.leftAt}${account.middle} revision ${account.returnedAt}`

describe("describeRecycling", () => {
  it("names both nodes and the revision the id changed hands", () => {
    expect(joinRecycling(describeRecycling(recyclingOf("n_4", 9)))).toBe(
      "was a loom.card until revision 1, and a text from revision 9"
    )
  })

  it("describes a restoration as the round trip it is", () => {
    expect(joinRecycling(describeRecycling(restorationOf("n_4")))).toBe(
      "was removed at revision 1 and put back at revision 2"
    )
  })

  /**
   * Both revisions are handed over as numbers so both can be linked (0043).
   * A finding that named the two changes which made an id ambiguous and then
   * made the reviewer retype them would be the odd thing to ship.
   */
  it("keeps both revisions out of the words", () => {
    const account = describeRecycling(recyclingOf("n_4", 9))

    expect(account).toMatchObject({ leftAt: 1, returnedAt: 9 })
    expect(account.opening).not.toContain("1")
    expect(account.middle).not.toContain("9")
  })
})

describe("stoppedAt", () => {
  it("stops at the delta that would not apply", () => {
    expect(stoppedAt({ code: "delta-rejected", revision: 12, detail: "unknown-node" })).toBe(12)
  })

  /**
   * The expected revision is the hole in the log — no entry holds it, so it is
   * a description of absence rather than a place. The found one is the entry
   * the fold actually read, and the only one of the two worth a link.
   */
  it("stops at the revision found in a gap, never the one expected", () => {
    expect(stoppedAt({ code: "revision-gap", expected: 3, found: 7 })).toBe(7)
  })
})
