import { describe, expect, it } from "vitest"

import {
  NOT_ON_PAGE,
  NO_CHANGE,
  inertNote,
  plainEffect,
  plainObstacle,
  plainOperationEffect,
} from "./effect-view"
import type { OperationEffect, ProposalEffect } from "./proposal-effect"
import { readingOf } from "./vocabulary"

/**
 * Every assertion about a sentence goes through `readingOf` and `toBe`.
 *
 * That is the 24 August lesson, and it is worth restating where it is being
 * applied rather than only where it was learned: a reading is composed from
 * three independently held strings, and `toContain` on any one of them passes
 * happily on a sentence with the space missing between them. The failure mode is
 * pinned directly at the bottom of this file.
 */

const operation = (over: Partial<OperationEffect> = {}): OperationEffect => ({
  op: "configure",
  verb: "reconfigure",
  subject: "loom.heading",
  place: ["loom.page", "loom.card"],
  detail: "1 value",
  into: null,
  before: null,
  from: null,
  changes: [{ key: "title", before: `"Ship faster"`, after: `"Ship safer"`, inert: false }],
  text: [],
  carries: null,
  missing: false,
  inert: false,
  ...over,
})

const effect = (over: Partial<ProposalEffect> = {}): ProposalEffect => ({
  operations: [operation()],
  applies: true,
  obstacle: null,
  baseRevision: 4,
  treeRevision: 4,
  stale: false,
  inertCount: 0,
  ...over,
})

const reading = (over: Partial<OperationEffect>): string =>
  readingOf(plainOperationEffect(operation(over)).reading)

describe("plainOperationEffect", () => {
  describe("adding", () => {
    it("names what arrives, where it lands and what it lands above", () => {
      expect(
        reading({
          op: "insert",
          verb: "add",
          subject: "loom.card",
          into: "loom.band",
          before: "loom.heading",
          changes: [],
          carries: 1,
        })
      ).toBe("Adds a loom.card inside loom.band, just before loom.heading.")
    })

    it("says the end of a list rather than naming a part that is not there", () => {
      expect(
        reading({
          op: "insert",
          verb: "add",
          subject: "loom.card",
          into: "loom.band",
          before: null,
          changes: [],
          carries: 1,
        })
      ).toBe("Adds a loom.card at the end of loom.band.")
    })

    /** `carries` counts the node itself, so what is being announced is the rest. */
    it("counts what comes with it, excluding itself", () => {
      expect(
        reading({
          op: "insert",
          verb: "add",
          subject: "loom.card",
          into: "loom.band",
          before: null,
          changes: [],
          carries: 4,
        })
      ).toBe("Adds a loom.card at the end of loom.band. It brings 3 more pieces with it.")
    })

    it("says nothing about what it brings when it brings nothing", () => {
      expect(
        reading({
          op: "insert",
          verb: "add",
          subject: "loom.card",
          into: "loom.band",
          before: null,
          changes: [],
          carries: 1,
        })
      ).not.toContain("brings")
    })

    it("says the destination is gone rather than that the new part is", () => {
      expect(
        reading({
          op: "insert",
          verb: "add",
          subject: "loom.card",
          into: null,
          changes: [],
          carries: 1,
          missing: true,
        })
      ).toBe("Would add a loom.card, but the part it would go inside isn't on this page any more.")
    })
  })

  describe("deleting", () => {
    it("counts what goes with it", () => {
      expect(
        reading({ op: "remove", verb: "delete", subject: "loom.band", changes: [], carries: 5 })
      ).toBe("Deletes the loom.band, and the 4 pieces inside it.")
    })

    it("says a leaf is a leaf rather than counting nothing", () => {
      expect(
        reading({ op: "remove", verb: "delete", subject: "loom.heading", changes: [], carries: 1 })
      ).toBe("Deletes the loom.heading, which has nothing inside it.")
    })

    it("spells the one number that grates as a digit mid-sentence", () => {
      expect(
        reading({ op: "remove", verb: "delete", subject: "loom.band", changes: [], carries: 2 })
      ).toBe("Deletes the loom.band, and the one piece inside it.")
    })

    it("puts a part that is gone in the conditional", () => {
      expect(
        reading({
          op: "remove",
          verb: "delete",
          subject: "n_gone",
          changes: [],
          carries: null,
          missing: true,
        })
      ).toBe("Would delete n_gone, but that part isn't on this page any more.")
    })
  })

  describe("moving", () => {
    it("names both ends when it leaves where it was", () => {
      expect(
        reading({
          op: "move",
          verb: "move",
          subject: "loom.card",
          from: "loom.band",
          into: "loom.grid",
          changes: [],
        })
      ).toBe("Moves the loom.card out of loom.band and into loom.grid.")
    })

    /** Reordering inside one parent is not a change of address, and must not read as one. */
    it("says a reorder is a reorder", () => {
      expect(
        reading({
          op: "move",
          verb: "move",
          subject: "loom.card",
          from: null,
          into: "loom.band",
          changes: [],
        })
      ).toBe("Moves the loom.card to a different place inside loom.band.")
    })

    it("distinguishes a missing destination from a missing part", () => {
      expect(
        reading({
          op: "move",
          verb: "move",
          subject: "loom.card",
          from: "loom.band",
          into: null,
          changes: [],
        })
      ).toBe("Would move loom.card, but the part it would go into isn't on this page any more.")
    })
  })

  describe("changing settings", () => {
    it("names the settings that change", () => {
      expect(
        reading({
          changes: [
            { key: "title", before: null, after: `"Ship safer"`, inert: false },
            { key: "width", before: "12", after: "16", inert: false },
          ],
        })
      ).toBe("Changes the loom.heading's title and width.")
    })

    /** Taking a setting away is different news from giving it a new value. */
    it("gives clearing its own verb", () => {
      expect(
        reading({ changes: [{ key: "gap", before: "4", after: null, inert: false }] })
      ).toBe("Takes away the loom.heading's gap.")
    })

    it("says both when it does both", () => {
      expect(
        reading({
          changes: [
            { key: "title", before: null, after: `"Ship safer"`, inert: false },
            { key: "gap", before: "4", after: null, inert: false },
          ],
        })
      ).toBe("Changes the loom.heading's title, and takes away its gap.")
    })

    it("does not claim a change when the operation lists no settings", () => {
      expect(reading({ changes: [], detail: "no values" })).toBe(
        "Changes nothing about the loom.heading — it lists no settings."
      )
    })

    it("puts a part that is gone in the conditional", () => {
      expect(reading({ subject: "n_gone", changes: [], missing: true })).toBe(
        "Would change n_gone, but that part isn't on this page any more."
      )
    })
  })

  describe("how a step stands", () => {
    it("says a step naming a part that is gone cannot happen", () => {
      expect(plainOperationEffect(operation({ missing: true })).standing).toBe(NOT_ON_PAGE)
    })

    it("says a step that writes what is there would achieve nothing", () => {
      expect(plainOperationEffect(operation({ inert: true })).standing).toBe(NO_CHANGE)
    })

    /** Missing wins: a step that cannot happen is not a step that would do nothing. */
    it("reports the part that is gone rather than the emptiness", () => {
      expect(plainOperationEffect(operation({ missing: true, inert: true })).standing).toBe(
        NOT_ON_PAGE
      )
    })

    it("says nothing at all about an ordinary step", () => {
      expect(plainOperationEffect(operation()).standing).toBeNull()
    })
  })

  describe("the words it moves", () => {
    it("says words are arriving when they are arriving", () => {
      expect(
        plainOperationEffect(
          operation({ op: "insert", verb: "add", text: ["Ship faster", "Talk to us"] })
        ).words
      ).toBe("The words it adds: “Ship faster” · “Talk to us”")
    })

    /** The same list of strings is opposite news depending on which way it travels. */
    it("says words are going when they are going", () => {
      expect(
        plainOperationEffect(operation({ op: "remove", verb: "delete", text: ["Ship faster"] }))
          .words
      ).toBe("The words it takes away: “Ship faster”")
    })

    it("says nothing when no words move", () => {
      expect(plainOperationEffect(operation()).words).toBeNull()
    })
  })

  /**
   * The half of the rule that is easy to lose: the delta's own account is not
   * reworded, it is relocated. If this ever stops holding, the disclosure has
   * quietly become a summary.
   */
  it("carries the delta's own account through unaltered", () => {
    expect(
      plainOperationEffect(operation({ verb: "reconfigure", detail: "2 values, 1 already set this way" }))
        .technical
    ).toBe("reconfigure loom.heading — 2 values, 1 already set this way")
  })

  it("carries the place and the before-and-after through untouched", () => {
    const plain = plainOperationEffect(operation())

    expect(plain.place).toEqual(["loom.page", "loom.card"])
    expect(plain.changes).toHaveLength(1)
  })

  /**
   * The whole point of the rewrite, as a property rather than as fifteen
   * assertions: no sentence a reviewer reads unasked is in the delta model's
   * vocabulary.
   */
  it("keeps the delta model's words out of every reading", () => {
    const cases: readonly Partial<OperationEffect>[] = [
      { op: "insert", verb: "add", into: "loom.band", before: "loom.heading", changes: [], carries: 3 },
      { op: "remove", verb: "delete", changes: [], carries: 2 },
      { op: "move", verb: "move", from: "loom.band", into: "loom.grid", changes: [] },
      {},
      { missing: true, changes: [] },
    ]

    for (const one of cases) {
      const sentence = reading(one).toLowerCase()

      for (const word of ["insert", "reconfigure", "node", "delta", "tree", "prop", "index"]) {
        expect(sentence).not.toContain(word)
      }
    }
  })

  it("ends every reading in a full stop", () => {
    const cases: readonly Partial<OperationEffect>[] = [
      { op: "insert", verb: "add", into: "loom.band", before: null, changes: [], carries: 4 },
      { op: "remove", verb: "delete", changes: [], carries: 1 },
      { op: "move", verb: "move", from: null, into: "loom.band", changes: [] },
      { changes: [] },
      { changes: [{ key: "gap", before: "4", after: null, inert: false }] },
      { missing: true, changes: [] },
    ]

    for (const one of cases) expect(reading(one).endsWith(".")).toBe(true)
  })
})

describe("plainObstacle", () => {
  it("says nothing about a proposal that would apply", () => {
    expect(plainObstacle(effect())).toBeNull()
  })

  it("counts how far the page has moved, and says what to do about it", () => {
    const obstacle = plainObstacle(
      effect({ applies: false, stale: true, baseRevision: 4, treeRevision: 7 })
    )

    expect(obstacle?.label).toBe("This was worked out on an older version of this page.")
    expect(obstacle?.meaning).toContain("changed 3 times")
    expect(obstacle?.meaning).toContain("Turn it down and ask again.")
  })

  it("counts one as once", () => {
    expect(
      plainObstacle(effect({ applies: false, stale: true, baseRevision: 6, treeRevision: 7 }))
        ?.meaning
    ).toContain("changed 1 time")
  })

  /**
   * `applyDelta` checks the revision before it looks at an operation, so a stale
   * proposal's obstacle *is* the mismatch. Saying it in both vocabularies would
   * be one fact told twice.
   */
  it("keeps the runtime's own sentence out of the plain half and in the record", () => {
    const obstacle = plainObstacle(
      effect({
        applies: false,
        stale: true,
        baseRevision: 4,
        treeRevision: 7,
        obstacle: "Delta targets revision 4 but the tree is at revision 7.",
      })
    )

    expect(obstacle?.meaning).not.toContain("Delta targets")
    /**
     * The runtime's sentence is what the disclosure is *for*, stale or not. It
     * was being replaced by a restatement of the revision pair — which
     * `plainEffect` prints anyway, so the record said one fact twice and dropped
     * the only sentence nothing else carried.
     */
    expect(obstacle?.technical).toBe("Delta targets revision 4 but the tree is at revision 7.")
  })

  /** Only when the runtime said nothing does the portal supply the pair itself. */
  it("falls back to the two revision numbers when the runtime named no obstacle", () => {
    expect(
      plainObstacle(effect({ applies: false, stale: true, baseRevision: 4, treeRevision: 7 }))
        ?.technical
    ).toBe("the change was judged against revision 4; this page is at revision 7")
  })

  /** A proposal refused for any other reason keeps the runtime's words verbatim. */
  it("keeps a non-revision obstacle exactly as the runtime said it", () => {
    const obstacle = plainObstacle(
      effect({ applies: false, obstacle: "No node n_p9 in this tree." })
    )

    expect(obstacle?.label).toBe("This would not work on the page as it stands.")
    expect(obstacle?.technical).toBe("No node n_p9 in this tree.")
  })
})

describe("inertNote", () => {
  it("says so when the whole proposal would change nothing", () => {
    expect(inertNote(effect({ inertCount: 1 }))).toBe(
      "Every part of this writes what is already there — saying yes would leave the page exactly as it is."
    )
  })

  it("counts a partly inert proposal without claiming the whole of it is", () => {
    expect(inertNote(effect({ operations: [operation(), operation()], inertCount: 1 }))).toBe(
      "1 of these 2 steps writes what is already there."
    )
  })

  it("says nothing when every step would do something", () => {
    expect(inertNote(effect())).toBeNull()
  })

  /** On a proposal that would be refused, this is a footnote to news already had. */
  it("says nothing on a proposal that would not apply at all", () => {
    expect(inertNote(effect({ applies: false, inertCount: 1 }))).toBeNull()
  })
})

describe("plainEffect", () => {
  it("prints both revision numbers whether or not they are the problem", () => {
    expect(plainEffect(effect({ baseRevision: 6, treeRevision: 6 })).revisions).toBe(
      "judged against revision 6 · this page is at revision 6"
    )
  })

  it("reads one plain step per operation, in the order they would be applied", () => {
    const plain = plainEffect(
      effect({
        operations: [
          operation({ op: "remove", verb: "delete", subject: "loom.card", changes: [], carries: 1 }),
          operation({
            op: "insert",
            verb: "add",
            subject: "loom.heading",
            into: "loom.band",
            before: null,
            changes: [],
            carries: 1,
          }),
        ],
      })
    )

    expect(plain.operations.map((one) => readingOf(one.reading))).toEqual([
      "Deletes the loom.card, which has nothing inside it.",
      "Adds a loom.heading at the end of loom.band.",
    ])
  })

  /**
   * The failure a `toContain` on either half cannot see. A `before` that has lost
   * its trailing space still satisfies both, and comes back as a word nobody
   * wrote.
   */
  it("reports a lost space as the broken sentence it is", () => {
    expect(readingOf({ before: "Deletes the", subject: "loom.card", after: "." })).toBe(
      "Deletes theloom.card."
    )
  })
})
