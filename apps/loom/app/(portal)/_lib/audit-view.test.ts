import { describe, expect, it } from "vitest"

import {
  buildElement,
  buildText,
  createTree,
  sequentialIdFactory,
  type IdReturn,
  type LoomTree,
  type NodeId,
} from "@jam-overture/loom"

import {
  describeAudit,
  describeDifference,
  describeFacets,
  describeMismatch,
  describeRecycling,
  explainDifference,
  explainFacets,
  explainRecycling,
  nameOfDifference,
  readCheckup,
  stoppedAt,
  toneOfAudit,
  type RecyclingAccount,
  DIFFERENCE_LIMIT,
  RECYCLING_LIMIT,
} from "./audit-view"
import { runtimeWordsIn } from "../_test/plain-language"

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
  /**
   * The mirror of `stoppedAt`, and the pairing a screen relies on to tell a
   * verdict that weighed something from one that could not: a fold that stopped
   * part-way replayed no number of changes anybody can print.
   */
  it("carries the revision it checked, and null exactly when nothing was compared", () => {
    const { stored, replayed } = drifted(2)

    expect(describeAudit({ outcome: "agrees", revision: 4, idReturns: [] }).revision).toBe(4)
    expect(
      describeAudit({ outcome: "diverged", revision: 2, stored, replayed, idReturns: [] }).revision
    ).toBe(2)
    expect(
      describeAudit({
        outcome: "unreplayable",
        mismatch: { code: "revision-gap", expected: 3, found: 7 },
      }).revision
    ).toBeNull()
  })

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

  /**
   * The names are taken here because here is the only place both trees exist at
   * once. A page that had to read the head again to name a difference would be
   * naming it out of a tree that may have moved since the verdict was formed.
   */
  it("names every part it lists a difference for", () => {
    const { stored, replayed } = drifted(2)

    const report = describeAudit({ outcome: "diverged", revision: 2, stored, replayed, idReturns: [] })

    for (const difference of report.differences) {
      expect(report.names.get(difference.nodeId)?.name).toBeTypeOf("string")
    }
  })

  it("has nothing to name when there was no second tree to compare against", () => {
    expect(describeAudit({ outcome: "agrees", revision: 4, idReturns: [] }).names.size).toBe(0)
    expect(
      describeAudit({
        outcome: "unreplayable",
        mismatch: { code: "revision-gap", expected: 3, found: 7 },
      }).names.size
    ).toBe(0)
  })

  /**
   * The asymmetry that makes a difference different from a row on the page
   * screen: the node is in one of the two trees and not the other, so naming
   * from either alone leaves half the list unnamed.
   */
  it("names a part the fold produced and the served page does not have", () => {
    const stored = pageOf([])
    const replayed = pageOf(["only in the replay"])

    const report = describeAudit({ outcome: "diverged", revision: 3, stored, replayed, idReturns: [] })
    const extra = report.differences.find((difference) => difference.code === "extra")

    expect(extra).toBeDefined()
    expect(report.names.get(extra?.nodeId ?? "")?.name).toContain("only in the replay")
  })

  /**
   * A `changed` node is the one kind both trees hold. The served tree is the
   * page the reader is looking at, so its name is the one they can check.
   */
  it("names a changed part out of the page being served, not out of the replay", () => {
    /** Two factories from one seed word mint the same ids, so the two trees join. */
    const saying = (words: string): LoomTree => {
      const ids = sequentialIdFactory("tie")

      return createTree(
        buildElement(ids, { type: "loom.page", children: [buildText(ids, words)] }),
        ids
      )
    }

    const stored = saying("what readers see")
    const replayed = saying("what the replay says")

    const report = describeAudit({ outcome: "diverged", revision: 5, stored, replayed, idReturns: [] })
    const changed = report.differences.find((difference) => difference.code === "changed")

    expect(changed).toBeDefined()
    expect(report.names.get(changed?.nodeId ?? "")?.name).toContain("what readers see")
  })
})

/**
 * The defect this closed: the list under *This page does not match its own
 * history* printed `loom.footer` at somebody who came to this screen because
 * they think their site is broken.
 */
describe("nameOfDifference", () => {
  const namedDifferences = (count: number) => {
    const { stored, replayed } = drifted(count)
    const report = describeAudit({ outcome: "diverged", revision: count, stored, replayed, idReturns: [] })

    return report.differences.map((difference) => nameOfDifference(report.names, difference))
  }

  it("names a part by what it is and what it says, and never by a registered type", () => {
    const named = namedDifferences(2)

    expect(named.map((part) => part.name)).toContain("The prose “line 0”")
    for (const part of named) expect(part.name).not.toContain("loom.")
  })

  /** A row begins a line, and a row beginning "the prose" reads as a fragment. */
  it("starts the name with a capital", () => {
    for (const part of namedDifferences(1)) expect(part.name.slice(0, 1)).toBe(part.name.slice(0, 1).toUpperCase())
  })

  /**
   * Which part is identity rather than technical detail (22 August), so the id
   * travels with the name rather than behind it.
   */
  it("keeps the id beside the name", () => {
    const { stored, replayed } = drifted(1)
    const report = describeAudit({ outcome: "diverged", revision: 1, stored, replayed, idReturns: [] })

    for (const difference of report.differences) {
      expect(nameOfDifference(report.names, difference).nodeId).toBe(difference.nodeId)
    }
  })

  /**
   * Unreachable in practice — a difference always comes out of one of the two
   * trees — and the row still has to say something rather than nothing. The
   * runtime's label read as words is less than the words and more than an id
   * on its own.
   */
  it("falls back to the noun in the runtime's own label, and never to an empty name", () => {
    expect(
      nameOfDifference(new Map(), {
        code: "missing",
        nodeId: "n_gone" as NodeId,
        label: "loom.footer",
      }).name
    ).toBe("The footer")
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

describe("explainRecycling", () => {
  it("reads both labels as words, and keeps the runtime's own reading intact", () => {
    expect(joinRecycling(explainRecycling(recyclingOf("n_4", 9)))).toBe(
      "was a card until revision 1, and words from revision 9"
    )
    expect(joinRecycling(describeRecycling(recyclingOf("n_4", 9)))).toBe(
      "was a loom.card until revision 1, and a text from revision 9"
    )
  })

  /**
   * A host's own primitive gets named without the portal knowing about it,
   * which is the property that stops this being a table of the four types this
   * deployment happens to register.
   */
  it("reads a host's own namespaced, hyphenated type as words", () => {
    const found: IdReturn = {
      code: "recycled",
      nodeId: "n_4" as NodeId,
      leftAs: "acme.buy-button",
      returnedAs: "loom.card",
      leftAt: 1,
      returnedAt: 9,
    }

    expect(explainRecycling(found).opening).toBe("was a buy button until")
  })

  /**
   * `text` is the one label that is not a registered type — it is what the
   * runtime calls a node that only has words — so it loses the article rather
   * than becoming "a text", which nobody says.
   */
  it("says words rather than a text", () => {
    expect(joinRecycling(explainRecycling(recyclingOf("n_4", 9)))).not.toContain("a text")
  })

  it("leaves a restoration exactly as the runtime reads it, having no labels to translate", () => {
    expect(explainRecycling(restorationOf("n_4"))).toEqual(describeRecycling(restorationOf("n_4")))
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

/**
 * The plain reading. `describeAudit` above answers "did the fold agree"; these
 * answer "is my page all right, and what do I do".
 *
 * The property worth holding is that the two cannot disagree. Both are derived
 * from the same `AuditReport`, so a divergence the technical reading calls
 * `diverged` cannot be a screen whose headline says everything adds up — and a
 * test is what keeps that true once somebody edits one of the two tables.
 */
describe("readCheckup", () => {
  const agreeing = (idReturns: readonly IdReturn[] = []) =>
    describeAudit({ outcome: "agrees", revision: 4, idReturns })

  it("answers a clean fold with the answer and nothing to do", () => {
    const verdict = readCheckup(agreeing())

    expect(verdict.label).toBe("Everything on this page adds up.")
    expect(verdict.next).toBe("Nothing to do.")
    expect(verdict.tone).toBe("applied")
  })

  /**
   * The finding `Loom lessons` filed on 25 August, as a test. *"…so nothing on
   * it is unexplained"* promised the history was intact; a fold compares end
   * states, so a deployment holding a wrong starting shape sits on a green
   * verdict from the moment a change replaces the part it was wrong about. The
   * sentence's job is to claim exactly what was checked, which means naming the
   * shape it started from.
   */
  it("does not promise a clean fold means nothing on the page is unexplained", () => {
    const verdict = readCheckup(agreeing())

    expect(verdict.meaning).not.toContain("unexplained")
    expect(verdict.meaning).toContain("started from the shape it has on record")
  })

  /**
   * The same miscount under a red verdict, and the more expensive one: "one of
   * the two is wrong" sends a reviewer to look at the page and the history when
   * the fault may be in the starting shape, which is in neither.
   */
  it("does not tell a reviewer the fault is in one of two things", () => {
    const { stored, replayed } = drifted(2)
    const verdict = readCheckup(
      describeAudit({ outcome: "diverged", revision: 2, stored, replayed, idReturns: [] })
    )

    expect(verdict.meaning).not.toContain("One of the two")
    expect(verdict.meaning).toContain("shape Loom has on record")
  })

  it("says the page and its history disagree, and where to start", () => {
    const { stored, replayed } = drifted(2)
    const verdict = readCheckup(
      describeAudit({ outcome: "diverged", revision: 2, stored, replayed, idReturns: [] })
    )

    expect(verdict.label).toBe("This page does not match its own history.")
    expect(verdict.next).toContain("listed below")
    expect(verdict.tone).toBe("rejected")
  })

  /**
   * The distinction 0019 turns on, kept in the plain layer: no answer is not a
   * bad answer. A reader told the check failed must not come away thinking the
   * page was found wrong.
   */
  it("says a broken history checked nothing, rather than that the page failed", () => {
    const verdict = readCheckup(
      describeAudit({
        outcome: "unreplayable",
        mismatch: { code: "revision-gap", expected: 3, found: 7 },
      })
    )

    expect(verdict.label).toContain("nothing could be checked")
    expect(verdict.meaning).toContain("does not mean the page is wrong")
    expect(verdict.tone).toBe("uninterpreted")
  })

  /**
   * A green verdict above an unread warning is the failure this whole surface
   * is being rebuilt to avoid. The fold agreed, so the tone stays green — but
   * "nothing to do" would be false while there is something to look at.
   */
  it("does not say nothing to do while a recycled id is on the page", () => {
    const verdict = readCheckup(agreeing([recyclingOf("n_4", 3)]))

    expect(verdict.tone).toBe("applied")
    expect(verdict.label).toBe("Everything on this page adds up.")
    expect(verdict.next).not.toBe("Nothing to do.")
    expect(verdict.next).toContain("One thing to look at")
  })

  it("counts the recycled ids it names, including the ones it did not list", () => {
    const many = Array.from({ length: RECYCLING_LIMIT + 3 }, (_, index) =>
      recyclingOf(`n_${index}`, index + 2)
    )

    expect(readCheckup(agreeing(many)).next).toContain(`${RECYCLING_LIMIT + 3} names`)
  })

  /**
   * A restoration is the expected shape of a working review queue, not a
   * finding — so it must not turn a clean verdict into one with homework.
   */
  it("leaves a restored node out of the next move entirely", () => {
    expect(readCheckup(agreeing([restorationOf("n_4")])).next).toBe("Nothing to do.")
  })

  it("agrees in tone with the runtime's own reading, on all three outcomes", () => {
    const { stored, replayed } = drifted(1)
    const reports = [
      agreeing(),
      describeAudit({ outcome: "diverged", revision: 1, stored, replayed, idReturns: [] }),
      describeAudit({
        outcome: "unreplayable",
        mismatch: { code: "delta-rejected", revision: 5, detail: "unknown-node" },
      }),
    ]

    for (const report of reports) {
      expect(readCheckup(report).tone, report.tone).toBe(toneOfAudit(report.tone))
    }
  })

  /**
   * The rule the redirection is for, as a property rather than as taste. A
   * verdict is what somebody reads before they have asked for anything, so the
   * moment one of these sentences contains `snapshot` or `fold` it has become
   * the thing it replaced — and the technical reading is one disclosure away,
   * still saying all of them.
   */
  it("keeps the runtime's vocabulary out of all three sentences", () => {
    const { stored, replayed } = drifted(1)

    const reports = [
      agreeing(),
      agreeing([recyclingOf("n_4", 3)]),
      describeAudit({ outcome: "diverged", revision: 1, stored, replayed, idReturns: [] }),
      describeAudit({
        outcome: "unreplayable",
        mismatch: { code: "revision-gap", expected: 3, found: 7 },
      }),
    ]

    for (const report of reports) {
      const verdict = readCheckup(report)

      for (const sentence of [verdict.label, verdict.meaning, verdict.next]) {
        expect(runtimeWordsIn(sentence), sentence).toEqual([])
      }
    }
  })

  /** Guards the guard: the technical reading must actually trip the same list. */
  it("finds the vocabulary it bans in the reading it is kept out of", () => {
    expect(runtimeWordsIn(agreeing().detail)).not.toEqual([])
  })
})

describe("explainDifference", () => {
  /** The two `changed` facets a person is least likely to know the words for. */
  it("says what the two disagree about in words nobody has to look up", () => {
    expect(
      explainDifference({
        code: "changed",
        nodeId: "n_1" as NodeId,
        label: "loom.card",
        facets: ["props", "text"],
      })
    ).toBe("The page and the history disagree about its settings, its words.")
  })

  it("tells the two one-sided differences apart, which is the whole finding", () => {
    const missing = explainDifference({ code: "missing", nodeId: "n_1" as NodeId, label: "a" })
    const extra = explainDifference({ code: "extra", nodeId: "n_1" as NodeId, label: "a" })

    expect(missing).toContain("on the page people are being served")
    expect(extra).toContain("should be on the page, and it is not")
    expect(missing).not.toBe(extra)
  })

  /**
   * Two tables over one set of facets is a thing that drifts. They are allowed
   * to differ — that is the point — but a facet that came out the same in both
   * means somebody added a row to one and copied it into the other, and the
   * plain one has stopped being plain.
   */
  it("never renders a facet in the runtime's own words", () => {
    const facets = ["kind", "type", "name", "props", "text", "parent", "position"] as const

    for (const facet of facets) {
      expect(explainFacets([facet]), facet).not.toBe(describeFacets([facet]))
      expect(explainFacets([facet]), facet).not.toContain(facet)
    }
  })

  it("joins several facets the way the technical reading does", () => {
    expect(explainFacets(["parent", "position"])).toBe(
      "what it sits inside, where it sits among the things around it"
    )
  })
})
